"""Publish a prepared Vite build without a missing-dist window (Linux)."""
import ctypes
import os
from pathlib import Path
import shutil
import sys
import time


def activate(root: Path, prepared: Path) -> None:
    root = root.resolve()
    prepared = prepared.resolve()
    current = root / "dist"
    rollback = root / "dist.rollback"
    if prepared.parent != root or not prepared.name.startswith(".dist-build."):
        raise ValueError("Prepared build must be a .dist-build.* directory in the project")
    for name in ("index.html", "sw.js"):
        if not (prepared / name).is_file() or (prepared / name).stat().st_size == 0:
            raise ValueError(f"Missing build output: {name}")
    if current.is_symlink() or rollback.is_symlink():
        raise ValueError("Refusing to replace a symlink")

    # Preserve recent hashed chunks for old tabs; never prune fresh output.
    cutoff = time.time() - 7 * 86400
    assets = current / "assets"
    if assets.is_dir():
        for source in assets.rglob("*"):
            if not source.is_file() or source.is_symlink() or source.stat().st_mtime < cutoff:
                continue
            target = prepared / "assets" / source.relative_to(assets)
            if not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)

    if current.exists():
        libc = ctypes.CDLL(None, use_errno=True)
        renameat2 = libc.renameat2
        renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
        renameat2.restype = ctypes.c_int
        if renameat2(-100, os.fsencode(prepared), -100, os.fsencode(current), 2) != 0:
            error = ctypes.get_errno()
            raise OSError(error, os.strerror(error))
        if rollback.exists():
            shutil.rmtree(rollback)
        prepared.rename(rollback)
    else:
        prepared.rename(current)


if __name__ == "__main__":
    activate(Path(__file__).resolve().parent.parent, Path(sys.argv[1]))
