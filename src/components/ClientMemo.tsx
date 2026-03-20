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

export default function ClientMemo({ client, onClose }: ClientMemoProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>Памятка клиента — ${client.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #000; background: #fff; padding: 30px 40px; }
    .memo { max-width: 720px; margin: 0 auto; }
    .title { font-size: 28px; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 2px; border-bottom: 3px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
    .client-info { margin-bottom: 24px; }
    .client-info table { width: 100%; border-collapse: collapse; }
    .client-info td { padding: 5px 8px; font-size: 15px; }
    .client-info td:first-child { font-weight: bold; width: 140px; color: #444; }
    .client-name { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
    .access-box { border: 3px solid #000; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; background: #f9f9f9; }
    .access-box p { font-size: 14px; line-height: 1.7; }
    .access-box .url { font-weight: 900; font-size: 15px; }
    .credentials { border: 3px double #000; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; text-align: center; background: #fff; }
    .credentials-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 12px; }
    .cred-row { display: flex; justify-content: center; gap: 60px; }
    .cred-item label { display: block; font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .cred-item .cred-value { font-size: 30px; font-weight: 900; letter-spacing: 3px; color: #000; }
    .instruction { border-left: 4px solid #000; padding-left: 16px; }
    .instruction h3 { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px; }
    .instruction ol { padding-left: 20px; }
    .instruction ol li { font-size: 13px; line-height: 1.8; margin-bottom: 4px; }
    .instruction li strong { font-weight: 700; }
    .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 12px; text-align: center; font-size: 11px; color: #777; }
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
            <button onClick={onClose} className="px-4 py-2 rounded-lg border-2 border-gray-300 hover:bg-gray-100 transition font-semibold">
              Закрыть
            </button>
          </div>
        </div>

        <div ref={printRef} className="p-8 font-sans text-black">
          <div className="memo">
            <div
              className="text-center font-black text-2xl uppercase tracking-widest border-b-4 border-black pb-3 mb-5"
              style={{ letterSpacing: '3px' }}
            >
              ПАМЯТКА КЛИЕНТА
            </div>

            <div className="mb-5">
              <div className="text-xl font-black mb-2">{client.name}</div>
              <table className="w-full text-sm">
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

            <div className="border-3 border-black rounded-lg p-4 mb-5 bg-gray-50" style={{ border: '3px solid #000' }}>
              <p className="text-sm leading-relaxed">
                Для входа в личный кабинет клиента в любом браузере (Google Chrome, Yandex, Opera) введите следующий адрес —{' '}
                <span className="font-black text-base">https://asz-lg.ua</span>.
                Далее в открывшемся окне введите логин и пароль.
              </p>
            </div>

            <div className="text-center mb-5 py-4 px-4" style={{ border: '3px double #000', borderRadius: '8px' }}>
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">Данные для входа</div>
              <div className="flex justify-center gap-16">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Логин</div>
                  <div className="text-3xl font-black tracking-widest">{client.login}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Пароль</div>
                  <div className="text-3xl font-black tracking-widest">{client.password}</div>
                </div>
              </div>
            </div>

            <div style={{ borderLeft: '4px solid #000', paddingLeft: '16px' }}>
              <div className="font-black text-sm uppercase tracking-wide mb-3">Краткая инструкция по работе с личным кабинетом</div>
              <ol className="text-sm space-y-1" style={{ paddingLeft: '18px', listStyleType: 'decimal' }}>
                <li>Откройте браузер и перейдите по адресу <strong>https://asz-lg.ua</strong>.</li>
                <li>Введите свой <strong>логин</strong> и <strong>пароль</strong> в форму входа, нажмите «Войти».</li>
                <li>В личном кабинете вы увидите список ваших <strong>топливных карт</strong> с остатками и лимитами.</li>
                <li>Нажмите на карту, чтобы просмотреть <strong>историю операций</strong> по ней.</li>
                <li>Для <strong>блокировки/разблокировки</strong> карты используйте кнопку рядом с картой.</li>
                <li>Для <strong>перемещения топлива</strong> между картами выберите «Перемещение» и укажите количество.</li>
                <li>При возникновении вопросов обращайтесь в службу поддержки по телефону или email.</li>
              </ol>
            </div>

            <div className="mt-6 pt-3 border-t border-gray-300 text-center text-xs text-gray-400">
              АЗС «ЛГ» — автоматизированная система учёта топлива
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
