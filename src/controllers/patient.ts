import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { getPatientById, Patient, updatePatientById } from '../models/patient';
import { IVerifyPatient } from '../interfaces/verifyPatient';
import { MailService } from '../services/mail';

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

	@Route('get', '/code/:id')
	async getVerificationCode(req: Request, res: Response, next: NextFunction) {
		try {
			const findPatient = await getPatientById(req.params.id);

			if (!findPatient) {
				return res.status(404).json({ message: 'Patient not found' });
			}

			if (findPatient?.verified) {
				return res.status(403).json({
					message: 'Patient is already verified',
					patient: findPatient
				});
			}

			const newVerificationRequest = {
				verificationCode: Math.floor(1000 + Math.random() * 9000),
				expirationCode: new Date(new Date().getTime() + 5 * 60 * 1000)
			};

			const updateVerificationCodePatient = await updatePatientById(req.params.id, newVerificationRequest);

			logging.log('Verification code created successfully', updateVerificationCodePatient);

			//FIXME: cleanup or separate responsibilities of this part
			const emailMessage = `<h1> Your verification code: ${newVerificationRequest.verificationCode} </h1>`;
			const receiver = findPatient.email;
			const subject = 'NodeMailer Test New Code';

			const emailService = new MailService();
			const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
			logging.log(sent ? 'Verification code created successfully' : 'Error sending verification code');
			return res.status(200).json(updateVerificationCodePatient);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
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
			const findPatient = await getPatientById(req.params.id);

			if (!findPatient) {
				return res.status(404).json({ message: 'Patient not found' });
			}

			if (findPatient?.verified) {
				return res.status(403).json({
					message: 'Patient is already verified',
					patient: findPatient
				});
			}

			if (findPatient.expirationCode && req.body.verificationCode === findPatient.verificationCode && new Date() < findPatient.expirationCode) {
				const verifyPatientRequest = { verified: true };
				const verifyPatient = await updatePatientById(req.params.id, verifyPatientRequest);

				logging.log('Patient verified successfully');
				return res.status(200).json(verifyPatient);
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
