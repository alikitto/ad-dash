# Инструкция по очистке поврежденных данных localStorage

Если дашборд показывает белую страницу после изменения размеров столбцов, выполните следующие шаги:

## Способ 1: Через консоль браузера

1. Откройте консоль браузера (F12 или Cmd+Option+I на Mac)
2. Перейдите на вкладку "Console"
3. Выполните следующие команды:

```javascript
// Очистить данные о размерах столбцов
localStorage.removeItem('adsetTableColumnSizes');

// Очистить все данные фильтров
localStorage.removeItem('datePreset');
localStorage.removeItem('selectedAccount');
localStorage.removeItem('statusFilter');
localStorage.removeItem('objectiveFilter');
localStorage.removeItem('sortConfig');

// Перезагрузить страницу
location.reload();
```

## Способ 2: Полная очистка localStorage

Если способ 1 не помог, очистите весь localStorage:

```javascript
localStorage.clear();
location.reload();
```

## Способ 3: Через DevTools

1. Откройте DevTools (F12)
2. Перейдите на вкладку "Application" (Chrome) или "Storage" (Firefox)
3. В левой панели найдите "Local Storage"
4. Выберите ваш домен
5. Удалите ключи:
   - `adsetTableColumnSizes`
   - `datePreset`
   - `selectedAccount`
   - `statusFilter`
   - `objectiveFilter`
   - `sortConfig`
6. Перезагрузите страницу (F5)

## После очистки

После очистки данных страница должна загрузиться с настройками по умолчанию. Размеры столбцов вернутся к исходным значениям.

