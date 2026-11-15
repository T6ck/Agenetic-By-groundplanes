import unittest,importlib.util,tempfile,pathlib,types,sys,time,hashlib
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('runner',pathlib.Path(__file__).resolve().parents[1]/'public/agenetic-runner.py');runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
class ModelLibraryTests(unittest.TestCase):
 def test_large_existing_file_has_no_copy(self):
  with tempfile.TemporaryDirectory() as folder:
   root=pathlib.Path(folder);model=root/'large.gguf'
   with model.open('wb') as f:f.write(b'GGUF');f.truncate(25*1024**3)
   lib=runner.ModelLibrary(root/'library');m=lib.register(model)
   self.assertEqual(m['size'],25*1024**3);self.assertNotIn('path',m);self.assertEqual(list((root/'library').iterdir()),[root/'library'/'models.json'])
 def test_rejects_unsafe_references(self):
  v={'repo':'publisher/model','revision':'a'*40,'filename':'model.gguf'}
  self.assertEqual(runner.ModelLibrary.reference(v),tuple(v.values()))
  for changes in ({'revision':'main'},{'filename':'../model.gguf'},{'filename':'model-00001-of-00002.gguf'},{'filename':'model.py'},{'repo':'https://evil.test/model'}):
   with self.assertRaises(ValueError):runner.ModelLibrary.reference({**v,**changes})
 def download_fixture(self,bad_hash=False):
  with tempfile.TemporaryDirectory() as folder:
   lib=runner.ModelLibrary(folder);payload=b'GGUFfixture';item=types.SimpleNamespace(rfilename='model.gguf',size=len(payload),lfs=types.SimpleNamespace(sha256='0'*64 if bad_hash else hashlib.sha256(payload).hexdigest()))
   api=types.SimpleNamespace(model_info=lambda *a,**kw:types.SimpleNamespace(siblings=[item]));calls=[]
   def download(**kw):
    calls.append(kw);path=pathlib.Path(kw['local_dir'])/'model.gguf';path.write_bytes(payload);return str(path)
   class Progress:pass
   with patch.object(lib,'api',return_value=api),patch.object(lib,'credential',return_value=False),patch.dict(sys.modules,{'huggingface_hub':types.SimpleNamespace(hf_hub_download=download),'tqdm.auto':types.SimpleNamespace(tqdm=Progress)}):
    lib.download({'repo':'publisher/model','revision':'a'*40,'filename':'model.gguf'})
    for _ in range(100):
     if lib.job['state'] in ('complete','failed'):break
     time.sleep(.01)
   self.assertEqual(calls[0]['revision'],'a'*40);self.assertFalse(calls[0]['token']);return lib
 def test_pinned_download_registers_after_verification(self):
  lib=self.download_fixture();self.assertEqual(lib.job['state'],'complete',lib.job);self.assertEqual(lib.models[0]['source']['filename'],'model.gguf')
 def test_checksum_failure_does_not_register(self):
  lib=self.download_fixture(True);self.assertEqual(lib.job['state'],'failed');self.assertEqual(lib.models,[])
 def test_bad_gguf_not_registered(self):
  with tempfile.TemporaryDirectory() as folder:
   p=pathlib.Path(folder)/'bad.gguf';p.write_bytes(b'nope');lib=runner.ModelLibrary(pathlib.Path(folder)/'lib')
   with self.assertRaises(ValueError):lib.register(p)
   self.assertEqual(lib.models,[])
if __name__=='__main__':unittest.main()
