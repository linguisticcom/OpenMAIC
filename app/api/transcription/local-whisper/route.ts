import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createLogger } from '@/lib/logger';

const log = createLogger('LocalWhisper');

export const runtime = 'nodejs';
export const maxDuration = 120;

function runWhisper(inputPath: string, outputDir: string, model: string, language: string) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      '-m',
      'whisper',
      inputPath,
      '--model',
      model,
      '--output_dir',
      outputDir,
      '--output_format',
      'json',
      '--fp16',
      'False',
    ];

    if (language && language !== 'auto') {
      args.push('--language', language);
    }

    const child = spawn('python', args, {
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
      windowsHide: true,
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `Local Whisper exited with code ${code}`));
      }
    });
  });
}

export async function POST(req: NextRequest) {
  const workDir = join(tmpdir(), `openmaic-whisper-${randomUUID()}`);

  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const requestedModel =
      (formData.get('model') as string | null) || process.env.LOCAL_WHISPER_MODEL || 'base';
    const language = (formData.get('language') as string | null) || 'en';

    if (!audioFile) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Audio file is required');
    }

    await mkdir(workDir, { recursive: true });
    const extension = audioFile.name.match(/\.[a-z0-9]+$/i)?.[0] || '.webm';
    const inputPath = join(workDir, `recording${extension}`);
    await writeFile(inputPath, Buffer.from(await audioFile.arrayBuffer()));

    await runWhisper(inputPath, workDir, requestedModel, language);

    const jsonOutput = (await readdir(workDir)).find((name) => name.endsWith('.json'));
    if (!jsonOutput) {
      throw new Error('Local Whisper did not produce a transcript file');
    }

    const output = JSON.parse(await readFile(join(workDir, jsonOutput), 'utf8')) as {
      text?: string;
    };

    return apiSuccess({ text: output.text?.trim() || '' });
  } catch (error) {
    log.warn('Local Whisper transcription failed:', error);
    return apiError(
      'TRANSCRIPTION_FAILED',
      500,
      'Local Whisper transcription failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
