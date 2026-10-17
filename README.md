# cursor-chat-minimap

Колонка отметок справа в чате окна Agents в Cursor: по одной на каждый запрос. При наведении появляется окошко с запросом и началом ответа. Клик переходит к запросу. Alt+клик переиндексирует чат. Идея взята из Qoder.

## English

A column of markers on the right side of the Cursor Agents chat, one per user prompt. Hover shows the prompt and the start of the reply. Click jumps to that prompt. Alt+click reindexes the chat. Inspired by Qoder.

## Установка (Windows)

Закройте Cursor.

Положите `chatminimap.js` в каталог:

`%LOCALAPPDATA%\Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\`

Перед правкой сделайте резервную копию `workbench.html`.

В `workbench.html` сразу после строки с `workbench.js` добавьте:

```html
<script src="./chatminimap.js" defer></script>
```

Строка с `workbench.js` выглядит так:

```html
<script src="./workbench.js" type="module"></script>
```

Либо из корня этого репозитория:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

`install.ps1` копирует `chatminimap.js`, сохраняет копию `workbench.html` как `workbench.html.cmm.bak` в том же каталоге и вставляет тег, если его ещё нет. Повторный запуск только обновляет `chatminimap.js` и не затирает уже сделанную копию.

Запустите Cursor снова.

## Удаление

Закройте Cursor и из корня репозитория выполните:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

Скрипт возвращает `workbench.html` из `workbench.html.cmm.bak` и удаляет `chatminimap.js`. Повторный запуск безопасен: если мода уже нет, файлы не меняются.

Если Cursor успел обновиться и тега в `workbench.html` уже нет, скрипт не подставляет старую копию поверх нового файла.

## Предупреждения

Cursor может показать «Your Cursor installation appears to be corrupt». Это безвредно и появляется из-за проверки контрольных сумм после правки `workbench.html`.

После обновления Cursor установку надо повторить: обновление затирает правки в каталоге `workbench`.

Это неофициальный мод. Используйте на свой риск.

## Лицензия

MIT. Текст в [LICENSE](LICENSE).

---

Сообщество ВК «Агент в деле»: https://vk.ru/agent_v_dele
