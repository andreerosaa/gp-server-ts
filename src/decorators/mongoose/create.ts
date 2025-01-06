import { Request, Response, NextFunction } from 'express';
import mongoose, { Model } from 'mongoose';

export function MongoCreate(model: Model<any>) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
			try {
				const { date } = req.body;

				const now = new Date();
				const inputDate = new Date(date);

				if (inputDate < now) {
					return res.status(403).json({ message: 'Not allowed to create sessions in the past' });
				}

				const document = new model({
					_id: new mongoose.Types.ObjectId(),
					...req.body
				});

				await document.save();

				req.mongoCreate = document;
			} catch (error) {
				logging.error(error);
				return res.status(500).json(error);
			}

			return originalMethod.call(this, req, res, next);
		};

		return descriptor;
	};
}
