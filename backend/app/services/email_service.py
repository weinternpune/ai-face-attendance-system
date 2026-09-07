import os
import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

logger = logging.getLogger("uvicorn")

class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.smtp_from = os.getenv("SMTP_FROM", "WeIntern Attendance <noreply@weintern.com>")

    def is_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_password)

    def _send_sync(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        if not self.is_configured():
            logger.info(f"[Email Simulated] To: {to_email} | Subject: {subject}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.smtp_from or self.smtp_user
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.smtp_user, [to_email], msg.as_string())

            logger.info(f"[Email Sent] Successfully dispatched to {to_email} via {self.smtp_host}")
            return True
        except Exception as e:
            logger.error(f"[Email Error] Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        return await asyncio.to_thread(self._send_sync, to_email, subject, html_content, text_content)

    def render_notice_template(self, employee_name: str, employee_id: str, alert_type: str, message: str) -> str:
        badge_color = "#f59e0b" if "LATE" in alert_type else "#ef4444" if "ABSENT" in alert_type else "#3b82f6"
        type_title = alert_type.replace('_', ' ').title()
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
                .header {{ background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 24px; border-bottom: 1px solid #334155; text-align: center; }}
                .logo {{ font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; }}
                .logo span {{ color: #60a5fa; }}
                .content {{ padding: 28px; }}
                .badge {{ display: inline-block; padding: 6px 14px; border-radius: 9999px; background: {badge_color}22; color: {badge_color}; border: 1px solid {badge_color}55; font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; }}
                .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 12px 0; }}
                .message-box {{ background: #0f172a; border-left: 4px solid {badge_color}; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0; }}
                .details-table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }}
                .details-table td {{ padding: 8px 0; border-bottom: 1px solid #334155; color: #94a3b8; }}
                .details-table td strong {{ color: #f8fafc; }}
                .footer {{ background: #0f172a; padding: 18px 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">We<span>Intern</span> Attendance</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Automated Workforce Management System</div>
                </div>
                <div class="content">
                    <div class="badge">{type_title}</div>
                    <h2 class="title">Attendance Notice</h2>
                    <p style="font-size: 14px; color: #cbd5e1; margin-top: 0;">Dear <strong>{employee_name}</strong>,</p>
                    <div class="message-box">
                        {message}
                    </div>
                    <table class="details-table">
                        <tr>
                            <td>Employee ID:</td>
                            <td style="text-align: right;"><strong>{employee_id}</strong></td>
                        </tr>
                        <tr>
                            <td>Notice Category:</td>
                            <td style="text-align: right;"><strong>{type_title}</strong></td>
                        </tr>
                        <tr>
                            <td>Dispatched By:</td>
                            <td style="text-align: right;"><strong>WeIntern Human Resources</strong></td>
                        </tr>
                    </table>
                </div>
                <div class="footer">
                    This is an automated attendance notice generated by WeIntern AI Biometric System.<br>
                    Please contact HR Department for any regularizations.
                </div>
            </div>
        </body>
        </html>
        """

    def render_digest_template(self, date_str: str, metrics: Dict[str, Any]) -> str:
        total = metrics.get("total_staff", 0)
        present = metrics.get("present", 0)
        late = metrics.get("late", 0)
        absent = metrics.get("absent", 0)
        on_leave = metrics.get("on_leave", 0)
        turnout = metrics.get("turnout_percentage", 0.0)

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
                .header {{ background: linear-gradient(135deg, #1e3a8a, #0f172a); padding: 24px; border-bottom: 1px solid #334155; text-align: center; }}
                .logo {{ font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; }}
                .logo span {{ color: #60a5fa; }}
                .content {{ padding: 28px; }}
                .grid {{ display: flex; flex-wrap: wrap; gap: 12px; margin: 20px 0; }}
                .card {{ flex: 1 1 45%; background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; text-align: center; }}
                .card-num {{ font-size: 24px; font-weight: 900; margin-top: 4px; }}
                .footer {{ background: #0f172a; padding: 18px 28px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">We<span>Intern</span> Attendance</div>
                    <div style="font-size: 13px; color: #60a5fa; font-weight: 700; margin-top: 4px;">Daily Executive Attendance Digest ({date_str})</div>
                </div>
                <div class="content">
                    <h3 style="margin-top: 0; color: #ffffff; font-size: 18px;">Workforce Turnout: <span style="color: #10b981;">{turnout}%</span></h3>
                    <div class="grid">
                        <div class="card">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Total Staff</div>
                            <div class="card-num" style="color: #ffffff;">{total}</div>
                        </div>
                        <div class="card">
                            <div style="font-size: 11px; color: #10b981; text-transform: uppercase; font-weight: 700;">Present</div>
                            <div class="card-num" style="color: #10b981;">{present}</div>
                        </div>
                        <div class="card">
                            <div style="font-size: 11px; color: #f59e0b; text-transform: uppercase; font-weight: 700;">Late Arrivals</div>
                            <div class="card-num" style="color: #f59e0b;">{late}</div>
                        </div>
                        <div class="card">
                            <div style="font-size: 11px; color: #ef4444; text-transform: uppercase; font-weight: 700;">Absent</div>
                            <div class="card-num" style="color: #ef4444;">{absent}</div>
                        </div>
                        <div class="card">
                            <div style="font-size: 11px; color: #06b6d4; text-transform: uppercase; font-weight: 700;">On Leave</div>
                            <div class="card-num" style="color: #06b6d4;">{on_leave}</div>
                        </div>
                    </div>
                </div>
                <div class="footer">
                    WeIntern Biometrics Workforce Intelligence System &bull; Pune, Maharashtra
                </div>
            </div>
        </body>
        </html>
        """

email_service = EmailService()
