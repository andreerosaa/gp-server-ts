import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';
import Joi from 'joi';
import { Validate } from '../decorators/validate';

const postHealthCheckValidation = Joi.object({
	name: Joi.string().required(),
	email: Joi.string().email()
});

@Controller()
class MainController {
	@Route('get', '/healthcheck')
	getHealthCheck(req: Request, res: Response, next: NextFunction) {
		logging.info('Get Healthcheck called successfully');
		return res.status(200).json({ hello: 'world!' });
	}

	@Route('post', '/healthcheck')
	@Validate(postHealthCheckValidation)
	postHealthCheck(req: Request, res: Response, next: NextFunction) {
		logging.info('Post Healthcheck called successfully');
		return res.status(200).json({ hello: 'world!', ...req.body });
	}
}

export default MainController;
