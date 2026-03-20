import { useRef } from 'react';

interface ClientMemoProps {
  client: {
    name: string;
    inn: string;
    address: string;
    phone: string;
    email: string;
    login: string;
    password: string;
  };
  onClose: () => void;
}

const SUPPORT_PHONE = '+7 959 144-19-40';
const SUPPORT_EMAIL = 'len4ik77.lena@mail.ru';

export default function ClientMemo({ client, onClose }: ClientMemoProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=820,height=1000');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Памятка клиента — ${client.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #000; background: #fff; padding: 32px 44px; }
    .memo { max-width: 700px; margin: 0 auto; }

    .title {
      font-size: 26px; font-weight: 900; text-align: center;
      text-transform: uppercase; letter-spacing: 3px;
      border-bottom: 4px solid #000; padding-bottom: 12px; margin-bottom: 20px;
    }

    .client-block { margin-bottom: 20px; }
    .client-name { font-size: 20px; font-weight: 900; margin-bottom: 8px; }
    .client-table { width: 100%; border-collapse: collapse; }
    .client-table td { padding: 4px 6px; font-size: 14px; }
    .client-table td:first-child { font-weight: 700; color: #444; width: 130px; }

    .access-box {
      border: 3px solid #000; border-radius: 6px;
      padding: 14px 18px; margin-bottom: 18px; background: #f5f5f5;
    }
    .access-box p { font-size: 13px; line-height: 1.75; }
    .access-url { font-weight: 900; font-size: 14px; }

    .cred-box {
      border: 3px double #000; border-radius: 8px;
      padding: 16px; margin-bottom: 18px; text-align: center;
    }
    .cred-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 12px; }
    .cred-row { display: flex; justify-content: center; gap: 60px; }
    .cred-item-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
    .cred-value { font-size: 30px; font-weight: 900; letter-spacing: 4px; color: #000; }

    .instruction { border-left: 4px solid #000; padding-left: 16px; margin-bottom: 20px; }
    .instruction-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .instruction ol { padding-left: 18px; }
    .instruction li { font-size: 13px; line-height: 1.8; margin-bottom: 3px; }

    .support { border-top: 2px solid #000; padding-top: 14px; text-align: center; }
    .support-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 10px; }
    .support-row { display: flex; justify-content: center; gap: 60px; }
    .support-item-label { font-size: 11px; color: #777; margin-bottom: 3px; }
    .support-value { font-size: 15px; font-weight: 900; }

    @media print {
      body { padding: 20px 30px; }
    }
  </style>
</head>
<body>
  ${printContent}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <span className="font-bold text-lg text-gray-800">Предпросмотр памятки</span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="bg-black text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
            >
              <span>🖨️</span> Печать
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border-2 border-gray-400 bg-white text-gray-800 hover:bg-gray-100 transition font-semibold"
            >
              Закрыть
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-8 font-sans text-black">
          <div className="memo">

            {/* Заголовок */}
            <div className="title text-center font-black text-2xl uppercase border-b-4 border-black pb-3 mb-5" style={{ letterSpacing: '3px' }}>
              ПАМЯТКА КЛИЕНТА
            </div>

            {/* Реквизиты клиента */}
            <div className="client-block mb-5">
              <div className="client-name text-xl font-black mb-2">{client.name}</div>
              <table className="client-table w-full text-sm">
                <tbody>
                  {client.inn && (
                    <tr>
                      <td className="font-bold text-gray-600 w-36 py-1">ИНН:</td>
                      <td className="py-1">{client.inn}</td>
                    </tr>
                  )}
                  {client.address && (
                    <tr>
                      <td className="font-bold text-gray-600 w-36 py-1">Адрес:</td>
                      <td className="py-1">{client.address}</td>
                    </tr>
                  )}
                  {client.phone && (
                    <tr>
                      <td className="font-bold text-gray-600 w-36 py-1">Телефон:</td>
                      <td className="py-1">{client.phone}</td>
                    </tr>
                  )}
                  {client.email && (
                    <tr>
                      <td className="font-bold text-gray-600 w-36 py-1">Email:</td>
                      <td className="py-1">{client.email}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Блок входа */}
            <div className="access-box mb-5 bg-gray-50 rounded-lg p-4" style={{ border: '3px solid #000' }}>
              <p className="text-sm leading-relaxed">
                Для входа в личный кабинет клиента в любом браузере (Google Chrome, Yandex, Opera) введите следующий адрес —{' '}
                <span className="access-url font-black text-base">https://asz-lg.ru</span>.
                {' '}Далее в открывшемся окне введите логин и пароль.
              </p>
            </div>

            {/* Данные для входа */}
            <div className="cred-box text-center mb-5 py-4 px-4" style={{ border: '3px double #000', borderRadius: '8px' }}>
              <div className="cred-label text-xs uppercase tracking-widest text-gray-500 mb-3">Данные для входа</div>
              <div className="cred-row flex justify-center gap-16">
                <div>
                  <div className="cred-item-label text-xs text-gray-500 uppercase tracking-widest mb-1">Логин</div>
                  <div className="cred-value text-3xl font-black tracking-widest">{client.login}</div>
                </div>
                <div>
                  <div className="cred-item-label text-xs text-gray-500 uppercase tracking-widest mb-1">Пароль</div>
                  <div className="cred-value text-3xl font-black tracking-widest">{client.password}</div>
                </div>
              </div>
            </div>

            {/* Инструкция */}
            <div className="instruction mb-5" style={{ borderLeft: '4px solid #000', paddingLeft: '16px' }}>
              <div className="instruction-title font-black text-sm uppercase tracking-wide mb-3">Краткая инструкция по работе с личным кабинетом</div>
              <ol className="text-sm space-y-1" style={{ paddingLeft: '18px', listStyleType: 'decimal' }}>
                <li>Откройте браузер и перейдите по адресу <strong>https://asz-lg.ru</strong>.</li>
                <li>Введите свой <strong>логин</strong> и <strong>пароль</strong> в форму входа, нажмите «Войти».</li>
                <li>В личном кабинете вы увидите список ваших <strong>топливных карт</strong> с остатками и лимитами.</li>
                <li>Нажмите на карту, чтобы просмотреть <strong>историю операций</strong> по ней.</li>
                <li>Для <strong>блокировки/разблокировки</strong> карты используйте кнопку рядом с картой.</li>
                <li>Для <strong>перемещения топлива</strong> между картами выберите «Перемещение» и укажите количество.</li>
                <li>При возникновении вопросов обращайтесь в службу поддержки по телефону или email.</li>
              </ol>
            </div>

            {/* Служба поддержки */}
            <div className="support mt-6 pt-3 border-t-2 border-black text-center">
              <div className="support-title text-xs uppercase tracking-widest text-gray-500 mb-2">Служба поддержки</div>
              <div className="support-row flex justify-center gap-10">
                <div>
                  <div className="support-item-label text-xs text-gray-500 mb-0.5">Телефон</div>
                  <div className="support-value font-black text-base">{SUPPORT_PHONE}</div>
                </div>
                <div>
                  <div className="support-item-label text-xs text-gray-500 mb-0.5">Email</div>
                  <div className="support-value font-black text-base">{SUPPORT_EMAIL}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}