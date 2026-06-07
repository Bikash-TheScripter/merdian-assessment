import 'dotenv/config';
import { AssessmentClient } from './apiClient.js';

async function probeRequirements() {
  const client = new AssessmentClient();

  console.log('Probing submission endpoint for Layer 1 specifications...');

  try {
    // Intentionally send a probe submission to inspect the error envelope clues.
    const response = await client.submit({
      type: 'layer_1',
      value: 'test_probe',
    });

    console.log('Unexpected success:', response.data);
  } catch (error: any) {
    console.log('\nTarget discovered. Server error envelope:');

    if (error.response) {
      console.log('Status:', error.response.status);
      console.dir(error.response.data, { depth: null });
      return;
    }

    console.log('Error:', error.message);
  }
}

probeRequirements();
