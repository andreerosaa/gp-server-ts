import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { Patient } from '../models/patient';
import { IVerifyPatient } from '../interfaces/verifyPatient';
import { server } from '../config/config';
import axios from 'axios';

@Controller('/patient')
class PatientController {
	@Route('get')
	@MongoGetAll(Patient)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id')
	@MongoGet(Patient)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('post')
	@MongoCreate(Patient)
	create(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoCreate);
	}

	@Route('post', '/query')
	@MongoQuery(Patient)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('post', '/verify/:id')
	async verify(req: Request<any, any, IVerifyPatient>, res: Response, next: NextFunction) {
		//TODO: validate request format
		try {
			const findPatient = await axios.get(`${server.SERVER_BASE_URL}/patient/${req.params.id}`);

			if (findPatient.data.verified) {
				return res.status(200).json({
					message: 'Patient is already verified',
					patient: findPatient.data
				});
			}

			if (req.body.verificationCode === findPatient.data.verificationCode && new Date() < new Date(findPatient.data.expirationCode)) {
				const verifyPatientRequest = { verified: true };
				const verifyPatient = await axios.patch(`${server.SERVER_BASE_URL}/patient/update/${req.params.id}`, verifyPatientRequest);

				logging.log('Patient verified sucessfully');
				return res.status(200).json(verifyPatient.data);
			} else {
				return res.status(400).json({ error: 'Invalid or expired code' });
			}
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('patch', '/update/:id')
	@MongoUpdate(Patient)
	update(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('delete', '/delete/:id')
	@MongoDelete(Patient)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default PatientController;
