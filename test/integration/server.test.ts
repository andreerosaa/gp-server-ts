import request from 'supertest';
import { application, Shutdown } from '../../src/server';

describe('Our application', () => {
	afterAll((done) => {
		Shutdown(done);
	});

	it('Starts and has the proper test environment', async () => {
		expect(process.env.NODE_ENV).toBe('test');
		expect(application).toBeDefined();
	}, 10000);

	it('Returns all options allowed to be called by clients (http methods)', async () => {
		const response = await request(application).options('/healthcheck');

		expect(response.status).toBe(200);
		expect(response.headers['access-control-allow-methods']).toBe('PUT, POST, PATCH, DELETE, GET');
	});

	it('Returns reponse with status 200 on get request to main controller', async () => {
		const response = await request(application).get('/healthcheck');
		expect(response.status).toBe(200);
	});
});
