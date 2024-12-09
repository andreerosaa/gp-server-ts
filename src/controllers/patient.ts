import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { getPatientByEmail, getPatientById, Patient, updatePatientById } from '../models/patient';
import { MailService } from '../services/mail';
import { authorizationHandler } from '../middleware/authorizationHandler';
import {
	getPatientByEmailRequestValidation,
	IGetPatientByEmail,
	IUpdatePatientName,
	IVerifyPatient,
	updatePatientNameRequestValidation
} from '../interfaces/patient';
import { Validate } from '../decorators/validate';

@Controller('/patient')
class PatientController {
	@Route('get', '', authorizationHandler)
	@MongoGetAll(Patient)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id', authorizationHandler)
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
			const emailMessage = `
						<h1> Ginásio Palmeiras </h1>
						<p> O seu código de verificação é: ${newVerificationRequest.verificationCode} </p>
					`;
			const receiver = findPatient.email;
			const subject = `Código de verificação: ${newVerificationRequest.verificationCode}`;

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

	@Route('post', '/query', authorizationHandler)
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

	@Route('post', '/name/:id')
	@Validate(updatePatientNameRequestValidation)
	async updatePatientName(req: Request<any, any, IUpdatePatientName>, res: Response, next: NextFunction) {
		try {
			const { name, email } = req.body;

			if (!name || !email) {
				return res.sendStatus(400);
			}

			const findPatient = await getPatientByEmail(email);

			if (!findPatient) {
				return res.status(404).json({ message: 'Patient not found' });
			}

			const updatePatientRequest = {
				name: name,
				email: email,
				verified: false,
				verificationCode: Math.floor(1000 + Math.random() * 9000),
				expirationCode: new Date(new Date().getTime() + 5 * 60 * 1000)
			};

			const updatedPatient = await updatePatientById(findPatient._id.toString(), updatePatientRequest);

			return res.status(200).json(updatedPatient);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('post', '/email')
	@Validate(getPatientByEmailRequestValidation)
	async getPatientByEmail(req: Request<any, any, IGetPatientByEmail>, res: Response, next: NextFunction) {
		try {
			const { email } = req.body;

			if (!email) {
				return res.sendStatus(400);
			}

			const findPatient = await getPatientByEmail(email);

			if (!findPatient) {
				return res.status(404).json({ message: 'Patient not found' });
			}

			return res.status(200).json(findPatient);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('patch', '/update/:id', authorizationHandler)
	@MongoUpdate(Patient)
	update(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('delete', '/delete/:id', authorizationHandler)
	@MongoDelete(Patient)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default PatientController;
