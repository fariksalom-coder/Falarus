import importlib.util
import os
from pathlib import Path
import tempfile
import time
import unittest

spec = importlib.util.spec_from_file_location("activate_build", Path(__file__).parents[1] / "activate-build.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ActivateBuildTest(unittest.TestCase):
    def test_publish_preserves_previous_release_and_recent_chunks(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            old = root / "dist"
            new = root / ".dist-build.test"
            for directory, text in ((old, "old"), (new, "new")):
                (directory / "assets").mkdir(parents=True)
                (directory / "index.html").write_text(text)
                (directory / "sw.js").write_text(text)
            (old / "assets/previous.js").write_text("previous chunk")
            (old / "assets/expired.js").write_text("expired chunk")
            expired = time.time() - 9 * 86400
            os.utime(old / "assets/expired.js", (expired, expired))
            (new / "assets/current.js").write_text("new chunk")
            # A fresh build asset must remain even if its source timestamp is old.
            os.utime(new / "assets/current.js", (expired, expired))
            module.activate(root, new)
            self.assertEqual((old / "index.html").read_text(), "new")
            self.assertEqual((root / "dist.rollback/index.html").read_text(), "old")
            self.assertTrue((old / "assets/previous.js").exists())
            self.assertTrue((old / "assets/current.js").exists())
            self.assertFalse((old / "assets/expired.js").exists())

    def test_incomplete_build_leaves_live_release_untouched(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "dist").mkdir()
            (root / "dist/index.html").write_text("live")
            new = root / ".dist-build.broken"
            new.mkdir()
            with self.assertRaises(ValueError):
                module.activate(root, new)
            self.assertEqual((root / "dist/index.html").read_text(), "live")


if __name__ == "__main__":
    unittest.main()
