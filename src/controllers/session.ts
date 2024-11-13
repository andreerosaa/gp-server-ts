import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import { MongoGetAll } from '../decorators/mongoose/getAll';
import { Session } from '../models/session';
import { MongoGet } from '../decorators/mongoose/get';
import { MongoCreate } from '../decorators/mongoose/create';
import { MongoQuery } from '../decorators/mongoose/query';
import { MongoUpdate } from '../decorators/mongoose/update';
import { MongoDelete } from '../decorators/mongoose/delete';
import { IBookSession } from '../interfaces/bookSession';
import axios from 'axios';
import { server } from '../config/config';
import { SessionStatusEnum } from '../interfaces/session';
import { MailService } from '../services/mail';

@Controller('/session')
class SessionController {
	@Route('get')
	@MongoGetAll(Session)
	getAll(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGetAll);
	}

	@Route('get', '/:id')
	@MongoGet(Session)
	getById(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoGet);
	}

	@Route('post')
	@MongoCreate(Session)
	create(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoCreate);
	}

	@Route('post', '/query')
	@MongoQuery(Session)
	query(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json(req.mongoQuery);
	}

	@Route('post', '/book/:id')
	async book(req: Request<any, any, IBookSession>, res: Response, next: NextFunction) {
		try {
			//TODO: add format validation
			//TODO: send generated code via sms or email
			const findPatientRequest = { email: req.body.email };
			const findPatientByEmail = await axios.post(`${server.SERVER_BASE_URL}/patient/query`, findPatientRequest);
			const updateSessionRequest = { patientId: '', status: SessionStatusEnum.PENDING };

			if (!findPatientByEmail.data.length) {
				try {
					const createPatientRequest = {
						name: req.body.patientName,
						email: req.body.email,
						verified: false,
						verificationCode: Math.floor(1000 + Math.random() * 9000),
						expirationCode: new Date(new Date().getTime() + 5 * 60 * 1000)
					};
					const createPatient = await axios.post(`${server.SERVER_BASE_URL}/patient`, createPatientRequest);
					logging.log('Patient created sucessfully', createPatient.data);
					updateSessionRequest.patientId = createPatient.data._id;

					//FIXME: cleanup or separate responsibilities of this part
					const emailMessage = `<h1> Your verification code: ${createPatientRequest.verificationCode} </h1>`;
					const receiver = req.body.email;
					const subject = 'NodeMailer Test 1';

					const emailService = new MailService();
					const sent: boolean = await emailService.send({ message: emailMessage, to: receiver, subject });
					logging.log(sent ? 'Verification code created sucessfully' : 'Error sending verification code');
				} catch (error) {
					logging.error(error);
					return res.status(500).json(error);
				}
			} else {
				updateSessionRequest.patientId = findPatientByEmail.data[0]._id;
			}
			const updateSession = await axios.patch(`${server.SERVER_BASE_URL}/session/update/${req.params.id}`, updateSessionRequest);
			return res.status(201).json(updateSession.data);
		} catch (error) {
			logging.error(error);
			return res.status(500).json(error);
		}
	}

	@Route('patch', '/update/:id')
	@MongoUpdate(Session)
	update(req: Request, res: Response, next: NextFunction) {
		return res.status(201).json(req.mongoUpdate);
	}

	@Route('delete', '/delete/:id')
	@MongoDelete(Session)
	delete(req: Request, res: Response, next: NextFunction) {
		return res.status(200).json({ message: 'deleted' });
	}
}

export default SessionController;
