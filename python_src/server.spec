# -*- mode: python ; coding: utf-8 -*-

import os
print(os.path.abspath("./"))
import importlib

block_cipher = None


dlls = ["concrt140.dll",
"mfc140.dll",
"mfc140chs.dll",
"mfc140cht.dll",
"mfc140deu.dll",
"mfc140enu.dll",
"mfc140esn.dll",
"mfc140fra.dll",
"mfc140ita.dll",
"mfc140jpn.dll",
"mfc140kor.dll",
"mfc140rus.dll",
"mfc140u.dll",
"mfcm140.dll",
"mfcm140u.dll",
"msvcp140.dll",
"msvcp140_1.dll",
"msvcp140_2.dll",
"msvcp140_codecvt_ids.dll",
"vcamp140.dll",
"vccorlib140.dll",
"vcomp140.dll",
"vcruntime140.dll",
"vcruntime140_1.dll"]

on_windows = os.path.exists('C:/Windows')


if on_windows:
    dlls = [(os.path.join('C:/Windows/System32/', f), '.') for f in dlls]
else:
    dlls = []

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

hiddenimports = collect_submodules('tensorflow')
datas = collect_data_files('tensorflow', subdir=None, include_py_files=True)
hiddenimports += collect_submodules('skimage')
datas += collect_data_files('skimage', subdir=None, include_py_files=True)

    

a = Analysis(['server.py'],
             pathex=[],
             binaries=[],
             datas=datas + [(os.path.join(os.path.dirname(importlib.import_module('tensorflow').__file__),
                                  "lite/experimental/microfrontend/python/ops/_audio_microfrontend_op.so"),
                     "tensorflow/lite/experimental/microfrontend/python/ops/"),
                     (os.path.join(os.path.dirname(importlib.import_module('tensorflow').__file__),
                                  "python/keras/engine/base_layer_v1.py"),
                     "tensorflow/python/keras/engine/")
                     ] + dlls,
             hiddenimports=hiddenimports + ['pkg_resources.py2_warn','tensorflow.compiler.tf2tensorrt', 'imgaug', 'tensorflow', 'tensorflow_core', 'scipy', 'numpy', 'skimage', 'PIL', 'opencv-python', 'zerorpc'],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher,
             noarchive=False)
a.datas = [d for d in a.datas if not d[0].endswith(".mp4")]
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          [],
          exclude_binaries=True,
          name='server',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          console=True )
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               upx_exclude=[],
               name='server')


try:
    os.unlink("./dist/server/_pywrap_tensorflow_internal.pyd")
except Exception as e:
    print(e)