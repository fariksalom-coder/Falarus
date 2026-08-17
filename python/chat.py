"""
Minimal Ollama client for FalaRus language-learning tasks.

Talks to the local Ollama server (localhost:11434) using the `ollama` Python
package. `aya` is chosen as the default model since it has strong Russian and
Turkic (Uzbek) coverage, which fits the FalaRus audience.

Usage:
    ./venv/bin/python chat.py                      # runs the demo below
    ./venv/bin/python chat.py "your prompt here"   # one-off prompt
"""

import sys

import ollama

DEFAULT_MODEL = "aya"


def ask(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Send a single prompt to a local Ollama model and return its reply."""
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response["message"]["content"]


if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(ask(" ".join(sys.argv[1:])))
    else:
        # Demo: generate a Russian vocabulary item with an Uzbek translation.
        demo_prompt = (
            "Give one common Russian noun for a beginner. Format exactly as:\n"
            "Russian: <word>\nUzbek: <translation>\nExample: <short Russian sentence>"
        )
        print(ask(demo_prompt))
