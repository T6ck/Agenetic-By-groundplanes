"""Verify the packaged companion imports a real GGUF and returns local inference."""
import json
import os
from pathlib import Path
import queue
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
import uuid

companion, llama, fixture = (Path(arg).resolve() for arg in sys.argv[1:])
with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    model_file = root / 'research model.gguf'
    shutil.copyfile(fixture, model_file)
    key = secrets.token_urlsafe(32)
    command = ([sys.executable, str(companion)] if companion.suffix == '.py' else [str(companion)])
    command += ['--desktop', '--origin', 'agenetic://app', '--port', '0',
                '--models-dir', str(root / 'library'), '--llama-cli', str(llama)]
    process = subprocess.Popen(command, stdout=subprocess.PIPE, text=True,
                               env={**os.environ, 'AGENETIC_SESSION_KEY': key})
    events = queue.Queue()

    def wait_for_ready():
        for line in process.stdout:
            try:
                event = json.loads(line)
            except ValueError:
                continue
            if event.get('event') == 'ready':
                events.put(event)
                return

    threading.Thread(target=wait_for_ready, daemon=True).start()
    try:
        event = events.get(timeout=60)
        base = f"http://127.0.0.1:{event['port']}"

        def call(route, payload=None, credential=key):
            request = urllib.request.Request(
                base + route, headers={
                    'Origin': 'agenetic://app', 'Authorization': 'Bearer ' + credential,
                    'Content-Type': 'application/json',
                }, data=None if payload is None else json.dumps(payload).encode(),
            )
            try:
                with urllib.request.urlopen(request, timeout=315 if route == '/run' else 15) as response:
                    return response.status, json.load(response)
            except urllib.error.HTTPError as error:
                with error:
                    return error.code, json.load(error)

        status, health = call('/status')
        assert status == 200 and health['inference'], health
        assert call('/models/register', {'path': str(model_file)}, credential='incorrect')[0] == 403
        missing_status, missing = call('/models/register', {'path': str(root / 'missing.gguf')})
        assert missing_status == 400 and 'Could not read' in missing['error'], missing
        status, result = call('/models/register', {'path': str(model_file)})
        assert status == 200, result
        model = result['model']
        assert model['size'] == fixture.stat().st_size and 'path' not in model
        assert model in call('/models')[1]['models']
        payload = {
            'model': model['name'], 'model_id': model['id'], 'role': 'Story writer',
            'instructions': 'Write a short story.', 'task': 'Once upon a time there was a small bird.',
            'context': 'File: Story notes\n' + 'A small bird learns to fly. ' * 35, 'request_id': str(uuid.uuid4()),
        }
        assert call('/run', {**payload, 'model_id': '0' * 24})[0] == 409
        assert call('/run', {**payload, 'model_source': {'revision': 'incorrect'}})[0] == 409
        status, inference = call('/run', payload)
        assert status == 200 and inference.get('output', '').strip(), inference
        assert 'Loading model...' not in inference['output'] and '<reference_excerpts>' not in inference['output'], inference
        print('Packaged companion verified authenticated GGUF registration, model identity checks, and real inference.')
    finally:
        process.kill()
        process.wait(timeout=15)
def sample_pdf(with_text):
    stream = b'BT /F1 12 Tf 40 100 Td (Local PDF evidence 42) Tj ET' if with_text else b''
    objects = [
        b'<< /Type /Catalog /Pages 2 0 R >>',
        b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        b'<< /Length ' + str(len(stream)).encode() + b' >>\nstream\n' + stream + b'\nendstream',
    ]
    pdf = b'%PDF-1.4\n'
    offsets = []
    for n, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf += f'{n} 0 obj\n'.encode() + obj + b'\nendobj\n'
    xref = len(pdf)
    pdf += b'xref\n0 6\n0000000000 65535 f \n'
    pdf += b''.join(f'{offset:010d} 00000 n \n'.encode() for offset in offsets)
    pdf += f'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
    return pdf


parser = ([sys.executable, str(companion)] if companion.suffix == '.py' else [str(companion)])
for with_text in (True, False):
    parsed = subprocess.run(parser + ['--extract-pdf'], input=sample_pdf(with_text),
                            capture_output=True, timeout=30, check=True)
    indexed = json.loads(parsed.stdout)
    if with_text:
        assert indexed['pages'] == 1 and indexed['text'] == '[Page 1]\nLocal PDF evidence 42', indexed
    else:
        assert 'No selectable text' in indexed['error'], indexed
print('Packaged PDF reader extracted page text and reported a source with no selectable text.')
