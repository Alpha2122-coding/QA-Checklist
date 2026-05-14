import 'dotenv/config';
import { app } from './app';
import pino from 'pino';

const logger = pino();
const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  logger.info({ port }, 'Backend service started');
});
