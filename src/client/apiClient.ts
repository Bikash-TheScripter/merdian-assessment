import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

type SubmissionPayload = {
  type: string;
  value: string;
  notes?: string;
};

export class AssessmentClient {
  private readonly http: AxiosInstance;

  constructor(baseUrl = process.env.BASE_URL, apiKey = process.env.API_KEY) {
    if (!baseUrl) {
      throw new Error('BASE_URL environment variable is required');
    }

    if (!apiKey) {
      throw new Error('API_KEY environment variable is required');
    }

    this.http = axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async submit(payload: SubmissionPayload): Promise<AxiosResponse<unknown>> {
    return this.http.post('/api/v1/submit', payload);
  }
}
