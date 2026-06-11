import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import forge from 'node-forge';

type DatasetPayload = {
  data: string[];
};

function sha256(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

async function getPrivateKey(): Promise<string> {
  const baseUrl = process.env.BASE_URL;
  const apiKey = process.env.API_KEY;

  if (!baseUrl || !apiKey) {
    return readFile('data/private-key.pem', 'utf8');
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/private-key`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const privateKey = await response.text();

    if (!response.ok) {
      throw new Error(`Private key request failed: ${response.status} ${privateKey}`);
    }

    return privateKey;
  } catch (error) {
    console.warn(`Falling back to saved private key: ${(error as Error).message}`);

    return readFile('data/private-key.pem', 'utf8');
  }
}

async function main(): Promise<void> {
  const dataset = JSON.parse(
    await readFile('data/layer1-dataset.json', 'utf8'),
  ) as DatasetPayload;
  const privateKeyPem = await getPrivateKey();
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

  const decryptedRecords = dataset.data.map((record) => {
    const encrypted = forge.util.decode64(record);

    return privateKey.decrypt(encrypted, 'RSAES-PKCS1-V1_5');
  });

  await mkdir('data', { recursive: true });
  await writeFile('data/private-key.pem', privateKeyPem);
  await writeFile(
    'data/decrypted-records.json',
    `${JSON.stringify(decryptedRecords.map((record) => JSON.parse(record)), null, 2)}\n`,
  );

  console.log('decrypted count:', decryptedRecords.length);
  console.log('first record:', decryptedRecords[0]);
  console.log('decrypted_hash:', sha256(decryptedRecords.join('')));
}

await main();
