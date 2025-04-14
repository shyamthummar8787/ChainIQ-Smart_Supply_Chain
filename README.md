# ChainIQ Smart Supply Chain

![Project Logo](ChainIQ-Smart_Supply_Chain-backup/static/images/logo.png)

A smart supply chain management system (formerly known as "repl-nix-workspace" v0.1.0) with document processing and data visualization capabilities.

## Features

- Document recognition and processing
- Supply chain data visualization
- Interactive chatbot interface
- Advanced document analytics
- Responsive web interface

## Technologies Used

- **Backend**: Python, Flask
- **Frontend**: HTML5, CSS3, JavaScript
- **Database**: SQLAlchemy
- **Document Processing**: PyPDF2
- **Data Visualization**: Chart.js (inferred from CSS files)

## Installation

### System Requirements
- Python 3.8 or higher
- PostgreSQL 12+ (for production)
- Node.js 16+ (for frontend development)
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space

### Detailed Setup Guide

1. **Clone the repository**:
```bash
git clone https://github.com/samthummar8787gamil.com/ChainIQ-Smart_Supply_Chain.git
cd ChainIQ-Smart_Supply_Chain
```

2. **Set up Python environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Python dependencies**:
```bash
pip install --upgrade pip
pip install -e .[dev]  # Includes development dependencies
```

4. **Database setup**:
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Create database user
sudo -u postgres createuser -P chainiq_user
sudo -u postgres createdb -O chainiq_user chainiq_db
```

5. **Configuration**:
```bash
cp .env.example .env
nano .env  # Edit with your configuration
```

6. **Database migrations**:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```



## Dependencies

### Core Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| Flask | ^2.0.0 | Web framework |
| Flask-SQLAlchemy | ^3.0.0 | Database ORM |
| PyPDF2 | ^3.0.0 | PDF processing |
| psycopg2-binary | ^2.9.0 | PostgreSQL adapter |
| Gunicorn | ^20.1.0 | Production server |

### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| pytest | ^7.0.0 | Testing framework |
| pytest-cov | ^4.0.0 | Test coverage |
| black | ^22.0.0 | Code formatting |
| flake8 | ^5.0.0 | Linting |

### Frontend Dependencies
- Bootstrap 5.2.0
- Chart.js 3.7.0
- jQuery 3.6.0







### Optional Configuration
```ini
# Document processing settings
DOCUMENT_UPLOAD_FOLDER=/var/uploads
MAX_CONTENT_LENGTH=16 * 1024 * 1024  # 16MB limit

# Email settings (for notifications)
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=user@example.com
MAIL_PASSWORD=password

## Project Structure

```
ChainIQ-Smart_Supply_Chain/
├── static/               # Frontend assets
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   └── images/           # Image assets
├── templates/            # Flask templates
├── app.py                # Main application
├── main.py               # Entry point
├── models.py             # Database models
├── vector_store.py       # Document processing
└── pyproject.toml        # Project dependencies
```


```

2. Access the web interface at `http://localhost:5000`

3. Use the document upload feature to process supply chain documents

4. View analytics in the visualization dashboard

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[MIT](https://choosealicense.com/licenses/mit/)
