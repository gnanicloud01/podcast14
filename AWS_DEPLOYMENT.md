# AWS Deployment Guide for SoundWave Music Player

## Prerequisites
- AWS CLI installed and configured
- EB CLI installed: `npm install -g @aws-amplify/cli`
- AWS account with appropriate permissions

## Deployment Methods

### Method 1: AWS Elastic Beanstalk (Recommended)

#### Step 1: Initialize Elastic Beanstalk
```bash
# Install EB CLI if not already installed
npm install -g @aws-amplify/cli

# Initialize your application
eb init

# Follow prompts:
# - Select region (e.g., us-east-1)
# - Application name: soundwave-music-player
# - Platform: Node.js
# - Platform version: Latest
# - SSH keypair: Create new or use existing
```

#### Step 2: Create Environment
```bash
# Create production environment
eb create production

# Or create with specific instance type
eb create production --instance-type t3.micro
```

#### Step 3: Deploy
```bash
# Deploy your application
eb deploy

# Check status
eb status

# View logs
eb logs
```

#### Step 4: Configure Environment Variables
```bash
# Set production environment variables
eb setenv NODE_ENV=production
eb setenv SESSION_SECRET=your-super-secure-secret-key-here
eb setenv PORT=8080
```

### Method 2: AWS EC2 Manual Deployment

#### Step 1: Launch EC2 Instance
1. Go to AWS Console → EC2
2. Launch Instance (Amazon Linux 2 or Ubuntu)
3. Instance type: t3.micro (free tier)
4. Configure security group: Allow HTTP (80), HTTPS (443), SSH (22)

#### Step 2: Connect and Setup
```bash
# Connect to instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Update system
sudo yum update -y

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PM2 for process management
npm install -g pm2

# Clone your repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Install dependencies
npm install

# Start with PM2
pm2 start server.js --name "soundwave"
pm2 startup
pm2 save
```

#### Step 3: Setup Nginx (Optional)
```bash
# Install Nginx
sudo yum install -y nginx

# Configure Nginx
sudo nano /etc/nginx/conf.d/soundwave.conf
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Method 3: AWS App Runner

#### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directory for SQLite database
RUN mkdir -p /app/data

# Set permissions
RUN chmod 755 /app/data

EXPOSE 8080

# Start the application
CMD ["npm", "start"]
```

#### Step 2: Deploy to App Runner
1. Go to AWS Console → App Runner
2. Create service
3. Source: Container registry or Source code repository
4. Configure build settings
5. Deploy

## Environment Variables for Production

Set these environment variables in your AWS deployment:

```bash
NODE_ENV=production
PORT=8080
SESSION_SECRET=your-super-secure-random-string-here
```

## Database Considerations

### SQLite in Production
- **Pros**: Simple, no additional setup
- **Cons**: Single file, limited concurrent writes

### Upgrade to RDS (Recommended for scale)
If you expect high traffic, consider migrating to AWS RDS:

1. Create RDS PostgreSQL instance
2. Update your code to use PostgreSQL
3. Migrate data from SQLite

## Security Checklist

- [ ] Change default admin credentials
- [ ] Set strong SESSION_SECRET
- [ ] Enable HTTPS (use AWS Certificate Manager)
- [ ] Configure security groups properly
- [ ] Regular database backups
- [ ] Monitor application logs

## Monitoring and Maintenance

### CloudWatch Logs
- Application logs automatically sent to CloudWatch
- Set up alarms for errors

### Health Checks
- Elastic Beanstalk automatically monitors application health
- Configure custom health check endpoint if needed

### Backups
```bash
# For SQLite database backup
eb ssh
sudo cp /var/app/current/music_player.db /tmp/backup-$(date +%Y%m%d).db
```

## Troubleshooting

### Common Issues:

1. **Database Permission Errors**
   - Check file permissions on SQLite database
   - Ensure application directory is writable

2. **Port Binding Issues**
   - Verify PORT environment variable is set to 8080
   - Check security group allows traffic on port 80/443

3. **Memory Issues**
   - Monitor instance memory usage
   - Consider upgrading instance type

4. **Session Issues**
   - Ensure SESSION_SECRET is set
   - Check cookie settings for HTTPS

### Useful Commands:
```bash
# Check application status
eb status

# View recent logs
eb logs

# SSH into instance
eb ssh

# Update environment
eb deploy

# Terminate environment
eb terminate production
```

## Cost Optimization

- Use t3.micro for development (free tier eligible)
- Set up auto-scaling based on traffic
- Use CloudFront CDN for static assets
- Monitor costs with AWS Cost Explorer

## Next Steps After Deployment

1. **Custom Domain**: Configure Route 53 for custom domain
2. **SSL Certificate**: Use AWS Certificate Manager
3. **CDN**: Set up CloudFront for better performance
4. **Monitoring**: Configure detailed CloudWatch monitoring
5. **Backup Strategy**: Implement automated database backups

Your SoundWave music player is now ready for AWS deployment! 🚀