"""
File API for Enhanced File Picker
Provides file listing for different ComfyUI folder types
Supports aiohttp (ComfyUI default) and falls back to Flask if available.
"""

import os
import json
import time
from typing import Dict, List, Any, Optional
import folder_paths
from pathlib import Path

try:
    from aiohttp import web as aiohttp_web
except Exception:
    aiohttp_web = None

# File type mappings to ComfyUI folder names
FILE_TYPE_FOLDERS = {
    'models': 'checkpoints',
    'vae': 'vae',
    'loras': 'loras',
    'text_encoders': 'text_encoders',
    'diffusion_models': 'diffusion_models',
    'controlnet': 'controlnet',
    'upscale_models': 'upscale_models',
    'clip_vision': 'clip_vision',
    'style_models': 'style_models',
    'embeddings': 'embeddings',
    'hypernetworks': 'hypernetworks',
    'photomaker': 'photomaker',
    'gguf_unet_models': 'unet'
}

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    '.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft', '.gguf'
}

class FileAPI:
    """
    API for serving file lists for the enhanced file picker
    """

    @staticmethod
    def get_files_for_folder(folder_name: str, extensions: List[str]) -> Dict[str, Any]:
        """
        Get files for a specific ComfyUI folder

        Args:
            folder_name: Name of the ComfyUI folder (e.g., 'checkpoints', 'vae')
            extensions: List of file extensions to include

        Returns:
            Dict with 'files' key containing list of file info
        """
        try:
            # Get folder paths from ComfyUI
            if folder_name not in folder_paths.folder_names_and_paths:
                return {'error': f'Unknown folder type: {folder_name}', 'files': []}

            mapped_name = folder_paths.map_legacy(folder_name)
            folder_paths_list, supported_extensions = folder_paths.folder_names_and_paths.get(mapped_name, ([], set()))
            if not folder_paths_list:
                # Try direct name as fallback
                folder_paths_list, supported_extensions = folder_paths.folder_names_and_paths.get(folder_name, ([], set()))

            # Filter extensions if specified
            if extensions:
                supported_extensions = set(supported_extensions) & set(extensions)

            all_files: List[Dict[str, Any]] = []

            # Scan each folder path
            for folder_path in folder_paths_list:
                if not os.path.exists(folder_path):
                    continue

                try:
                    for filename in os.listdir(folder_path):
                        filepath = os.path.join(folder_path, filename)

                        # Check if it's a file (not directory)
                        if not os.path.isfile(filepath):
                            continue

                        # Check extension
                        _, ext = os.path.splitext(filename)
                        if ext.lower() not in supported_extensions and supported_extensions != {""}:
                            continue

                        # Get file stats
                        try:
                            stat = os.stat(filepath)
                            file_info = {
                                'name': filename,
                                'path': filepath,
                                'relative_path': os.path.relpath(filepath, folder_path),
                                'extension': ext.lower(),
                                'size': stat.st_size,
                                'modified': stat.st_mtime
                            }
                            all_files.append(file_info)
                        except (OSError, IOError):
                            # Skip files we can't stat
                            continue

                except (OSError, IOError) as e:
                    print(f"Warning: Could not read folder {folder_path}: {e}")
                    continue

            # Sort files by name
            all_files.sort(key=lambda x: x['name'].lower())

            return {'files': all_files, 'total': len(all_files)}

        except Exception as e:
            print(f"Error getting files for folder {folder_name}: {e}")
            return {'error': str(e), 'files': []}

    @staticmethod
    def get_all_supported_folders() -> Dict[str, Any]:
        """
        Get information about all supported folders and their file counts

        Returns:
            Dict with folder info
        """
        result = {}

        for file_type, folder_name in FILE_TYPE_FOLDERS.items():
            try:
                folder_info = FileAPI.get_files_for_folder(folder_name, [])
                file_count = len(folder_info.get('files', []))
                result[file_type] = {
                    'folder_name': folder_name,
                    'file_count': file_count,
                    'has_files': file_count > 0
                }
            except Exception as e:
                result[file_type] = {
                    'folder_name': folder_name,
                    'file_count': 0,
                    'has_files': False,
                    'error': str(e)
                }

        return result

    @staticmethod
    def search_files(query: str, folder_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Search files across folders

        Args:
            query: Search query
            folder_name: Optional specific folder to search in

        Returns:
            Dict with search results
        """
        all_results = []

        folders_to_search = [folder_name] if folder_name else FILE_TYPE_FOLDERS.values()

        for search_folder in folders_to_search:
            folder_info = FileAPI.get_files_for_folder(search_folder, [])
            files = folder_info.get('files', [])

            # Filter files by query
            query_lower = query.lower()
            matching_files = [
                file for file in files
                if query_lower in file['name'].lower()
            ]

            # Add folder context to results
            for file in matching_files:
                file['folder_type'] = search_folder
                all_results.append(file)

        return {
            'query': query,
            'total_results': len(all_results),
            'files': all_results
        }

# Flask route handlers for the web API
def register_file_api_routes(app):
    """
    Register file API routes with ComfyUI server.
    - If aiohttp app (default), use aiohttp routes.
    - Else, try Flask app.
    """
    if aiohttp_web and hasattr(app, 'router'):
        async def aio_get_files(request):
            try:
                folder_name = request.rel_url.query.get('folder_name')
                ext_param = request.rel_url.query.get('extensions', '')
                extensions = [e.strip() for e in ext_param.split(',') if e.strip()]
                if not folder_name:
                    return aiohttp_web.json_response({'error': 'folder_name is required', 'files': []}, status=400)
                result = FileAPI.get_files_for_folder(folder_name, extensions)
                return aiohttp_web.json_response(result)
            except Exception as e:
                return aiohttp_web.json_response({'error': str(e), 'files': []}, status=500)

        async def aio_get_folders(request):
            try:
                result = FileAPI.get_all_supported_folders()
                return aiohttp_web.json_response(result)
            except Exception as e:
                return aiohttp_web.json_response({'error': str(e)}, status=500)

        async def aio_search_files(request):
            try:
                query = request.rel_url.query.get('query', '')
                folder_name = request.rel_url.query.get('folder_name')
                if not query:
                    return aiohttp_web.json_response({'error': 'query is required', 'files': []}, status=400)
                result = FileAPI.search_files(query, folder_name)
                return aiohttp_web.json_response(result)
            except Exception as e:
                return aiohttp_web.json_response({'error': str(e), 'files': []}, status=500)

        async def aio_get_file_info(request):
            try:
                filepath = request.match_info.get('filepath')
                if not filepath or not os.path.exists(filepath):
                    return aiohttp_web.json_response({'error': 'File not found'}, status=404)
                stat = os.stat(filepath)
                file_info = {
                    'path': filepath,
                    'name': os.path.basename(filepath),
                    'size': stat.st_size,
                    'modified': stat.st_mtime,
                    'extension': os.path.splitext(filepath)[1].lower()
                }
                return aiohttp_web.json_response(file_info)
            except Exception as e:
                return aiohttp_web.json_response({'error': str(e)}, status=500)

        app.router.add_get('/superlora/files', aio_get_files)
        app.router.add_get('/superlora/folders', aio_get_folders)
        app.router.add_get('/superlora/search', aio_search_files)
        app.router.add_get('/superlora/file_info/{filepath:.*}', aio_get_file_info)
        print('File API: aiohttp routes registered')
        return

    # Flask fallback
    try:
        from flask import request

        @app.route('/superlora/files', methods=['GET', 'POST'])
        def get_files():
            try:
                if request.method == 'GET':
                    folder_name = request.args.get('folder_name')
                    ext_param = request.args.get('extensions', '')
                    extensions = [e.strip() for e in ext_param.split(',') if e.strip()]
                else:
                    data = json.loads(request.data.decode('utf-8') or '{}')
                    folder_name = data.get('folder_name')
                    extensions = data.get('extensions', [])
                if not folder_name:
                    return json.dumps({'error': 'folder_name is required', 'files': []}), 400
                result = FileAPI.get_files_for_folder(folder_name, extensions)
                return json.dumps(result), 200
            except json.JSONDecodeError:
                return json.dumps({'error': 'Invalid JSON', 'files': []}), 400
            except Exception as e:
                return json.dumps({'error': str(e), 'files': []}), 500

        @app.route('/superlora/folders', methods=['GET'])
        def get_folders():
            try:
                result = FileAPI.get_all_supported_folders()
                return json.dumps(result), 200
            except Exception as e:
                return json.dumps({'error': str(e)}), 500

        @app.route('/superlora/search', methods=['GET', 'POST'])
        def search_files():
            try:
                if request.method == 'GET':
                    query = request.args.get('query', '')
                    folder_name = request.args.get('folder_name')
                else:
                    data = json.loads(request.data.decode('utf-8') or '{}')
                    query = data.get('query', '')
                    folder_name = data.get('folder_name')
                if not query:
                    return json.dumps({'error': 'query is required', 'files': []}), 400
                result = FileAPI.search_files(query, folder_name)
                return json.dumps(result), 200
            except json.JSONDecodeError:
                return json.dumps({'error': 'Invalid JSON', 'files': []}), 400
            except Exception as e:
                return json.dumps({'error': str(e), 'files': []}), 500

        @app.route('/superlora/file_info/<path:filepath>', methods=['GET'])
        def get_file_info(filepath: str):
            try:
                if not os.path.exists(filepath):
                    return json.dumps({'error': 'File not found'}), 404
                stat = os.stat(filepath)
                file_info = {
                    'path': filepath,
                    'name': os.path.basename(filepath),
                    'size': stat.st_size,
                    'modified': stat.st_mtime,
                    'extension': os.path.splitext(filepath)[1].lower()
                }
                return json.dumps(file_info), 200
            except Exception as e:
                return json.dumps({'error': str(e)}), 500

        print('File API: Flask routes registered')
    except ImportError:
        print('File API: No compatible web framework found; routes not registered')
