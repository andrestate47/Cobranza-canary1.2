# Integraciones y Automatización

El sistema está diseñado para conectarse omnicanalmente, extendiendo la funcionalidad base a aplicaciones de terceros.

### Notificaciones
Respaldos o reportes diarios generados mediante procesos asíncronos y webhooks.

### WhatsApp
El sistema permite compartir recibos/boletas (generados vía html2canvas) directamente enviando intents de enlace a WhatsApp desde el cliente (ver [[Stack Tecnológico]]).

### Robotina e IA (n8n)
Integración latente de webhooks mediante n8n hacia WhatsApp / Meta Graph API / Evolution API.
- **Herramientas**: Flujos en n8n conectados a Graph API.
- **Propósito**: Automatizar la atención al cliente de Robotina, consultas de saldo de préstamos y recordatorios de pago de forma inteligente sin intervención humana.
- **Flujo de datos**: Los endpoints reciben y envían información al motor de inteligencia artificial externa para responder en lenguaje natural (ver [[Endpoints API]]).

---
**Notas relacionadas**:
- [[Endpoints API]]
- [[DOCUMENTACION]]

#ia #robotina #whatsapp #automatizacion #n8n
