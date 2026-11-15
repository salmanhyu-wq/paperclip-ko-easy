import json, subprocess, sys, tempfile, unittest
from pathlib import Path

class InstallerTest(unittest.TestCase):
    def test_apply_repeat_and_restore_without_touching_assets(self):
        with tempfile.TemporaryDirectory() as temp:
            ui=Path(temp); (ui/'assets').mkdir()
            asset=ui/'assets/original.js'; asset.write_text('original application')
            index=ui/'index.html'
            original='<!doctype html><html lang="en" class="dark"><head><title>Paperclip</title></head><body><div id="root"></div></body></html>'
            index.write_text(original)
            cmd=[sys.executable,str(Path(__file__).parent/'install.py'),'--ui-dir',str(ui)]
            subprocess.run(cmd,check=True,capture_output=True)
            patched=index.read_text()
            self.assertIn('lang="ko"',patched)
            self.assertIn('translate="no"',patched)
            self.assertEqual(patched.count('paperclip-ko-easy:start'),1)
            self.assertEqual(asset.read_text(),'original application')
            info=json.loads((ui/'paperclip-ko-easy/patch-info.json').read_text())
            self.assertGreaterEqual(info['entries'],1500)
            self.assertIn('동시 실행',(ui/'paperclip-ko-easy'/info['script']).read_text())
            subprocess.run(cmd,check=True,capture_output=True)
            self.assertEqual(index.read_text(),patched)
            subprocess.run(cmd+['--restore'],check=True,capture_output=True)
            self.assertEqual(index.read_text(),original)
            self.assertEqual(asset.read_text(),'original application')
    def test_invalid_directory_does_not_create_server_files(self):
        with tempfile.TemporaryDirectory() as temp:
            ui=Path(temp)
            result=subprocess.run([sys.executable,str(Path(__file__).parent/'install.py'),'--ui-dir',str(ui)],capture_output=True)
            self.assertNotEqual(result.returncode,0)
            self.assertEqual(list(ui.iterdir()),[])

if __name__=='__main__':unittest.main()
