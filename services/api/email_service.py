"""
Envío del correo de recuperación de contraseña, vía SendGrid.

SENDGRID_API_KEY y SENDGRID_FROM_EMAIL viven en variables de entorno (.env,
nunca en el código). SENDGRID_FROM_EMAIL tiene que ser un remitente
verificado en tu cuenta de SendGrid (Settings -> Sender Authentication ->
Single Sender Verification) -- sin eso, SendGrid rechaza el envío.
"""

import os

from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL")
RESET_TOKEN_EXPIRE_MINUTES = os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30")


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Manda el correo con el link de reset.

    Si falla -- API key mal puesta, SendGrid caído, lo que sea -- lo dejamos
    pasar en silencio (solo lo logueamos). forgot-password siempre tiene que
    responder 200 para no filtrar si el email existe, así que un problema
    del proveedor de correo no debe convertirse en un 500 para quien llenó
    el formulario.
    """
    if not SENDGRID_API_KEY or not SENDGRID_FROM_EMAIL:
        # Conveniencia de desarrollo: sin SendGrid configurado no hay forma de
        # recibir el correo real, así que dejamos el link en la consola del
        # servidor para poder probar el flujo igual.
        print(
            "[email_service] SENDGRID_API_KEY o SENDGRID_FROM_EMAIL no están "
            f"configurados; no se envió el correo de reset. Link para pruebas: {reset_url}"
        )
        return

    html_content = f"""
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color:#0f172a; margin-bottom: 8px;">Restablece tu contraseña</h2>
      <p style="color:#334155; font-size:15px; line-height:1.5;">
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en
        el panel interno de HealthCore Digital. Si fuiste tú, toca el botón de
        abajo. Este enlace vence en {RESET_TOKEN_EXPIRE_MINUTES} minutos y solo
        funciona una vez.
      </p>
      <p style="text-align:center; margin:28px 0;">
        <a href="{reset_url}"
           style="background:#0f172a; color:#ffffff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#64748b; font-size:13px; line-height:1.5;">
        Si el botón no funciona, copia y pega este link en tu navegador:<br>
        <a href="{reset_url}" style="color:#334155;">{reset_url}</a>
      </p>
      <p style="color:#94a3b8; font-size:12px; margin-top:24px;">
        Si tú no pediste esto, puedes ignorar este correo -- tu contraseña no
        ha cambiado.
      </p>
    </div>
    """

    message = Mail(
        from_email=SENDGRID_FROM_EMAIL,
        to_emails=to_email,
        subject="Restablece tu contraseña — HealthCore Digital",
        html_content=html_content,
    )

    try:
        client = SendGridAPIClient(SENDGRID_API_KEY)
        client.send(message)
    except Exception as exc:  # noqa: BLE001 -- ver docstring: nunca debe romper el 200 de arriba
        print(f"[email_service] No se pudo enviar el correo de reset: {exc}")
