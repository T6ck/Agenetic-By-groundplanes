import unittest,importlib.util,asyncio,subprocess,sys,socket,time
from pathlib import Path
spec=importlib.util.spec_from_file_location('runner',Path(__file__).resolve().parents[1]/'public/agenetic-runner.py');runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
class MCPTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
  cls.endpoint=f'http://127.0.0.1:{port}/mcp'
  code=f"from mcp.server.fastmcp import FastMCP\nm=FastMCP('test',host='127.0.0.1',port={port})\n@m.tool()\ndef add(a:int,b:int)->int:return a+b\nm.run(transport='streamable-http')"
  cls.proc=subprocess.Popen([sys.executable,'-c',code],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(100):
   try:
    with socket.create_connection(('127.0.0.1',port),timeout=.1):return
   except OSError:time.sleep(.05)
  raise RuntimeError('Test server failed to start')
 @classmethod
 def tearDownClass(cls):cls.proc.terminate();cls.proc.wait(timeout=10)
 def call(self,**kwargs):return asyncio.run(runner.mcp_request({'endpoint':self.endpoint,**kwargs},[self.endpoint]))
 def test_discover_and_call(self):
  self.assertEqual(self.call(action='list')['tools'][0]['name'],'add')
  result=self.call(action='call',name='add',arguments={'a':2,'b':3},confirmed=True)
  self.assertFalse(result['isError']);self.assertIn('5',str(result['content']))
 def test_endpoint_denied(self):
  with self.assertRaises(ValueError):asyncio.run(runner.mcp_request({'endpoint':self.endpoint,'action':'list'},[]))
 def test_unconfirmed_and_invalid_arguments(self):
  for args in [dict(action='call',name='add',arguments={'a':1,'b':2}),dict(action='call',name='add',arguments={'a':'bad'},confirmed=True)]:
   with self.assertRaises(Exception):self.call(**args)
if __name__=='__main__':unittest.main()
