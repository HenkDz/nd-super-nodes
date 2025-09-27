import os
import tempfile
import unittest
from types import SimpleNamespace

from backend import lora_utils


class ResolveLoraFullPathTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_default = tempfile.TemporaryDirectory()
        self.tmp_extra = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp_default.cleanup)
        self.addCleanup(self.tmp_extra.cleanup)

        self.relative_path = os.path.join("Qwen", "anime", "MysticAnime.safetensors")
        self.file_path = os.path.join(self.tmp_extra.name, self.relative_path)
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        with open(self.file_path, "wb") as handle:
            handle.write(b"stub")

        def get_folder_paths(category: str):
            self.assertEqual(category, "loras")
            return [self.tmp_default.name, self.tmp_extra.name]

        def get_filename_list(category: str):
            self.assertEqual(category, "loras")
            # ComfyUI emits forward slashes regardless of OS for nested entries
            return [self.relative_path.replace(os.sep, "/")]

        def get_full_path(category: str, name: str):
            self.assertEqual(category, "loras")
            normalized = os.path.normpath(name)
            for base_dir in [self.tmp_default.name, self.tmp_extra.name]:
                candidate = os.path.join(base_dir, normalized)
                if os.path.exists(candidate):
                    return candidate
            raise FileNotFoundError(name)

        self._original_folder_paths = lora_utils.folder_paths
        self._original_flag = lora_utils.COMFYUI_AVAILABLE
        lora_utils.folder_paths = SimpleNamespace(
            get_folder_paths=get_folder_paths,
            get_filename_list=get_filename_list,
            get_full_path=get_full_path,
        )
        lora_utils.COMFYUI_AVAILABLE = True
        self.addCleanup(self._restore_folder_paths)

    def _restore_folder_paths(self):
        lora_utils.folder_paths = self._original_folder_paths
        lora_utils.COMFYUI_AVAILABLE = self._original_flag

    def test_resolve_uses_extra_directory(self):
        result = lora_utils.resolve_lora_full_path(self.relative_path.replace(os.sep, "/"))
        self.assertIsNotNone(result)
        self.assertEqual(os.path.normpath(result), os.path.normpath(self.file_path))


if __name__ == "__main__":
    unittest.main()
