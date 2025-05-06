import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule); 
  app.enableCors({
    origin: '*', // Or '*' to allow all origins (not recommended for production)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // If you need to handle cookies across origins
  });
  await app.listen(3000);
  console.log('🚀 Server running on http://localhost:3000');
}
bootstrap();
