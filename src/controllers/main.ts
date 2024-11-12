import { Request, Response, NextFunction } from 'express';
import { Controller } from '../decorators/controller';
import { Route } from '../decorators/route';

@Controller()
class MainController {
	@Route('get', '/healthcheck')
	@Route('post', '/healthcheck')
	getHealthCheck(req: Request, res: Response, next: NextFunction) {
		logging.info('Healthcheck called successfully');
		return res.status(200).json({ hello: 'world!', ...req.body });
	}
}

export default MainController;
