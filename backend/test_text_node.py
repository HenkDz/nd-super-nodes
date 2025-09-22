"""
Test node with standard ComfyUI widgets: a STRING input and a STRING output.

Use this to verify frontend→backend serialization and preview outputs quickly.
"""

from typing import Tuple


class SuperTestEcho:
    NAME = "SuperTestEcho"
    CATEGORY = "tests"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": (
                    "STRING",
                    {
                        "default": "Hello from SuperTestEcho!",
                        "multiline": True,
                    },
                )
            },
            "optional": {},
            "hidden": {},
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("TEXT",)
    FUNCTION = "echo"

    def echo(self, text: str) -> Tuple[str]:
        try:
            print(f"[SuperTestEcho] Received text: {repr(text)}")
        except Exception:
            pass
        return (text,)


