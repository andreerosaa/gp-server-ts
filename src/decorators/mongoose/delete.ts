import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';

export function MongoDelete(model: Model<any>) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
			try {
				const document = await model.findOneAndDelete({ _id: req.params.id });

				if (!document) {
					return res.status(404).json({ error: 'NOT FOUND' });
				}
			} catch (error) {
				logging.error(error);
				return res.status(500).json(error);
			}

			return originalMethod.call(this, req, res, next);
		};

		return descriptor;
	};
}