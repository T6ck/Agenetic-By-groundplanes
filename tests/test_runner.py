"""HTTP boundary tests with a deterministic CLI fixture, not real model inference."""
import unittest, tempfile, subprocess, pathlib, sys, urllib.request, urllib.error, json, os

class RunnerBoundary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        root=pathlib.Path(cls.tmp.name)
        model=root/'audit.gguf';model.write_bytes(b'GGUFtest-only')
        cli=root/'fixture-cli';cli.write_text('#!'+sys.executable+'\nprint("fixture response")\n');cli.chmod(0o700)
        cls.proc=subprocess.Popen([sys.executable,str(pathlib.Path(__file__).resolve().parents[1]/'public/agenetic-runner.py'),'--models-dir',str(root/'models'),'--model',str(model),'--llama-cli',str(cli)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        cls.proc.stdout.readline();cls.proc.stdout.readline()
        cls.key=cls.proc.stdout.readline().strip().split(': ',1)[1]
    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate();cls.proc.wait(timeout=5);cls.tmp.cleanup()
    def request(self,path='/status',method='GET',origin='https://neuron-ops.enchantingflora5.chatgpt.site',key=None,payload=None):
        headers={'Origin':origin,'Authorization':'Bearer '+(self.key if key is None else key),'Content-Type':'application/json'}
        r=urllib.request.Request('http://127.0.0.1:7871'+path,method=method,headers=headers,data=None if payload is None else json.dumps(payload).encode())
        try:
            with urllib.request.urlopen(r,timeout=5) as out:return out.status,json.loads(out.read() or b'{}')
        except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
    def test_authenticated_status(self):self.assertEqual(self.request()[1]['model'],'audit.gguf')
    def test_wrong_key_denied(self):self.assertEqual(self.request(key='invalid')[0],403)
    def test_wrong_origin_denied(self):self.assertEqual(self.request(origin='https://untrusted.invalid')[0],403)
    def test_missing_fields_rejected(self):self.assertEqual(self.request('/run','POST',payload={})[0],400)
    def test_model_mismatch_rejected(self):
        p=dict(model='other.gguf',role='Reviewer',instructions='Cite sources',task='Review',context='')
        self.assertEqual(self.request('/run','POST',payload=p)[0],409)
    def test_reviewed_context_is_never_silently_cut(self):
        payload=dict(model='audit.gguf',role='Reviewer',instructions='Compare',task='Question',context='測'*1500,preserve_context=True)
        status,body=self.request('/run','POST',payload=payload)
        self.assertEqual(status,400)
        self.assertIn('passages',body['error'])

    def test_success_uses_cli_output(self):
        p=dict(model='audit.gguf',role='Reviewer',instructions='Cite sources',task='Review',context='')
        self.assertEqual(self.request('/run','POST',payload=p),(200,{'output':'fixture response'}))
if __name__=='__main__':unittest.main()
