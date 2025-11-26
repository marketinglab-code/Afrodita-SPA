# Guía de Despliegue - ANICA / Afrodita Spa

Esta guía te ayudará a desplegar el sistema ANICA en producción.

## 📋 Pre-requisitos

- Node.js 20 o superior
- PostgreSQL 12 o superior (recomendado: Heroku Postgres)
- Cuenta de OpenAI con acceso a GPT-4 y Vision
- Cuenta de Wassenger con WhatsApp conectado
- (Opcional) Google Cloud con Service Account para Calendar

## 🚀 Opción 1: Heroku (Recomendado)

### 1. Instalar Heroku CLI

```bash
brew tap heroku/brew && brew install heroku  # macOS
# o
curl https://cli-assets.heroku.com/install.sh | sh  # Linux
```

### 2. Login y crear app

```bash
heroku login
heroku create afrodita-spa-anica
```

### 3. Agregar PostgreSQL

```bash
heroku addons:create heroku-postgresql:mini
```

Esto configura automáticamente la variable `DATABASE_URL`.

### 4. Configurar variables de entorno

```bash
# OpenAI
heroku config:set OPENAI_API_KEY=sk-xxxxx
heroku config:set OPENAI_MODEL=gpt-4
heroku config:set OPENAI_VISION_MODEL=gpt-4-vision-preview

# Wassenger
heroku config:set WASSENGER_API_KEY=xxxxx
heroku config:set WASSENGER_DEVICE_ID=xxxxx
heroku config:set WASSENGER_WEBHOOK_SECRET=xxxxx
heroku config:set AFRODITA_WHATSAPP_NUMBER=0983370228

# Payphone
heroku config:set PAYPHONE_PAYMENT_LINK=https://ppls.me/0YOnSvhmrKrKG83BlsQYRQ

# Database
heroku config:set DB_SSL=true

# Google Calendar (opcional)
heroku config:set GOOGLE_CALENDAR_ID=primary
heroku config:set GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
heroku config:set GOOGLE_PRIVATE_KEY="$(cat google-key.json | jq -r .private_key)"
```

### 5. Deploy

```bash
git init
heroku git:remote -a afrodita-spa-anica
git add .
git commit -m "Initial commit"
git push heroku main
```

### 6. Ejecutar migraciones

```bash
heroku run npm run migrate
```

### 7. Verificar

```bash
heroku open
heroku logs --tail
```

### 8. Configurar webhook en Wassenger

URL del webhook: `https://afrodita-spa-anica.herokuapp.com/webhook/wassenger`

## 🐳 Opción 2: Docker

### 1. Crear Dockerfile

Ya incluido en el proyecto.

### 2. Build

```bash
docker build -t afrodita-anica .
```

### 3. Run

```bash
docker run -d \
  --name anica \
  -p 3000:3000 \
  --env-file .env \
  afrodita-anica
```

### 4. Deploy a Docker Hub

```bash
docker tag afrodita-anica yourusername/afrodita-anica:latest
docker push yourusername/afrodita-anica:latest
```

## ☁️ Opción 3: AWS (EC2 + RDS)

### 1. Crear RDS PostgreSQL

- Ir a AWS RDS Console
- Crear nueva instancia PostgreSQL
- Anotar endpoint y credenciales

### 2. Crear EC2 Instance

- Ubuntu 22.04 LTS
- t2.small o superior
- Security Group: permitir puerto 3000

### 3. Conectar por SSH y configurar

```bash
ssh -i tu-key.pem ubuntu@ec2-xxx.compute.amazonaws.com

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar código
git clone https://github.com/tu-repo/afrodita-spa.git
cd afrodita-spa

# Instalar dependencias
npm install

# Configurar .env
nano .env
# (pegar configuración)

# Ejecutar migraciones
npm run migrate

# Instalar PM2
sudo npm install -g pm2

# Iniciar servidor
pm2 start src/server.js --name anica
pm2 startup
pm2 save

# Configurar nginx como proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/anica
```

Configuración nginx:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/anica /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

## 🔒 Seguridad en Producción

### Variables de entorno sensibles

Nunca commitear:
- `.env`
- Llaves privadas
- API keys

### Recomendaciones

1. **Usar secretos de plataforma:**
   - Heroku Config Vars
   - AWS Secrets Manager
   - Azure Key Vault

2. **Webhook secret:**
   ```bash
   # Generar secret seguro
   openssl rand -hex 32
   ```

3. **Rate limiting:**
   Agregar a server.js:
   ```javascript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutos
     max: 100 // límite de requests
   });
   
   app.use('/webhook', limiter);
   ```

4. **HTTPS obligatorio:**
   ```javascript
   if (process.env.NODE_ENV === 'production') {
     app.use((req, res, next) => {
       if (req.header('x-forwarded-proto') !== 'https') {
         res.redirect(`https://${req.header('host')}${req.url}`);
       } else {
         next();
       }
     });
   }
   ```

## 📊 Monitoreo

### Logs en Heroku

```bash
heroku logs --tail
heroku logs --source app --tail
```

### Logs en PM2

```bash
pm2 logs anica
pm2 monit
```

### Health checks

Configurar monitoreo automático en:
- UptimeRobot (https://uptimerobot.com)
- Pingdom
- AWS CloudWatch

Endpoint: `https://tu-dominio.com/health`

## 🔄 Actualizar en Producción

### Heroku

```bash
git add .
git commit -m "Update"
git push heroku main
```

### EC2 con PM2

```bash
cd afrodita-spa
git pull origin main
npm install
npm run migrate  # si hay nuevas migraciones
pm2 restart anica
```

## 🆘 Troubleshooting

### Error: Database connection failed

1. Verificar `DATABASE_URL`
2. Verificar que PostgreSQL permita conexiones externas
3. Verificar SSL settings

```bash
heroku pg:info
heroku config:get DATABASE_URL
```

### Error: OpenAI timeout

1. Verificar API key
2. Verificar límites de uso
3. Aumentar timeout en .env:

```env
OPENAI_TIMEOUT=60000
```

### Webhook no recibe mensajes

1. Verificar URL en Wassenger
2. Verificar que el servidor sea accesible públicamente
3. Revisar logs:

```bash
heroku logs --tail | grep webhook
```

## 📈 Escalabilidad

### Horizontal Scaling (Heroku)

```bash
heroku ps:scale web=2
```

### Database Scaling

```bash
# Upgrade plan
heroku addons:upgrade heroku-postgresql:standard-0
```

### Caching con Redis

Agregar Redis para caché de conversaciones:

```bash
heroku addons:create heroku-redis:mini
```

## 🎯 Checklist de Deployment

- [ ] Variables de entorno configuradas
- [ ] Base de datos creada y accesible
- [ ] Migraciones ejecutadas
- [ ] Primera modelo (AN01) registrada
- [ ] Servidor iniciado y respondiendo
- [ ] Health check funcionando
- [ ] Webhook configurado en Wassenger
- [ ] Webhook secret configurado
- [ ] SSL/HTTPS activo
- [ ] Logs funcionando
- [ ] Monitoreo configurado
- [ ] Backup de base de datos programado

## 📞 Soporte

Para ayuda con el deployment:
- WhatsApp: 0983370228
- Email: soporte@afroditaspa.com

---

**🎀 Sistema ANICA - Listo para producción**
