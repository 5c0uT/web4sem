"use strict";

// Функция форматирует число для более аккуратного вывода в консоль.
// Округляем результат до двух знаков после запятой, чтобы избежать
// длинных дробных значений после вычислений.
function formatNumber(value) {
  return String(Math.round(value * 100) / 100);
}

// Отдельная функция для вывода названия блока задач.
// Это делает итоговый вывод в консоли более читаемым.
function logSection(title) {
  console.log(`--- ${title} ---`);
}

// Отдельная функция для обычного вывода значения в консоль.
// По замечанию преподавателя вывод отделен от вычислений.
function logValue(value) {
  console.log(value);
}

// Функция переводит температуру из одной шкалы в другую.
// direction определяет направление преобразования:
// 'toC' — из Фаренгейтов в Цельсии,
// 'toF' — из Цельсиев в Фаренгейты.
// Для выбора ветки используем switch, как и просили в правках.
function convertTemperature(value, direction) {
  switch (direction) {
    case "toC":
      // Формула перевода из градусов Фаренгейта в градусы Цельсия.
      return `${formatNumber((value - 32) * (5 / 9))} C`;
    case "toF":
      // Формула перевода из градусов Цельсия в градусы Фаренгейта.
      return `${formatNumber(value * (9 / 5) + 32)} F`;
    default:
      // Возвращаем сообщение, если направление указано неверно.
      return "Unknown direction";
  }
}

// Функция рассчитывает информацию о треугольнике по трем сторонам.
// Сначала проверяем, существует ли треугольник по неравенству треугольника.
// Если существует, считаем:
// - периметр,
// - площадь по формуле Герона,
// - отношение периметра к площади.
// Функция ничего не выводит в консоль, а только возвращает объект с данными.
function getTriangleInfo(a, b, c) {
  const exists = a + b > c && a + c > b && b + c > a;

  if (!exists) {
    return {
      exists: false,
    };
  }

  const perimeter = a + b + c;
  const halfPerimeter = perimeter / 2;
  const area = Math.sqrt(
    halfPerimeter *
      (halfPerimeter - a) *
      (halfPerimeter - b) *
      (halfPerimeter - c),
  );

  return {
    exists: true,
    perimeter,
    area,
    ratio: perimeter / area,
  };
}

// Отдельная функция только для вывода результатов по треугольнику.
// Здесь используется результат из getTriangleInfo,
// а сама логика вычислений остается в отдельной функции.
function logTriangleInfo(a, b, c) {
  const triangleInfo = getTriangleInfo(a, b, c);

  if (!triangleInfo.exists) {
    logValue("треугольника не существует");
    return;
  }

  logValue("треугольник существует");
  logValue(`периметр = ${formatNumber(triangleInfo.perimeter)}`);
  logValue(`Площадь = ${formatNumber(triangleInfo.area)}`);
  logValue(`Соотношение = ${formatNumber(triangleInfo.ratio)}`);
}

// Функция возвращает подпись для задачи Fizz-Buzz.
// По условию:
// - если число делится на 5, выводим 'fizz buzz',
// - если число четное, выводим 'buzz',
// - если число нечетное, выводим 'fizz'.
// Для нуля по примеру тоже должен выводиться buzz.
function getFizzBuzzLabel(number) {
  if (number !== 0 && number % 5 === 0) {
    return "fizz buzz";
  }

  return number % 2 === 0 ? "buzz" : "fizz";
}

// Отдельная функция для вывода всей последовательности Fizz-Buzz в консоль.
// Проходим циклом от 0 до переданного предела включительно.
function logFizzBuzz(limit) {
  for (let number = 0; number <= limit; number += 1) {
    logValue(`${number} ${getFizzBuzzLabel(number)}`);
  }
}

// Функция строит строку с "елкой".
// На каждой новой строке количество символов увеличивается на один.
// Нечетные строки состоят из '*', четные — из '#'.
// В конце добавляется ствол '||'.
// В результате возвращается одна строка с символами новой строки между уровнями.
function buildTree(lines) {
  const treeLines = [];

  for (let line = 1; line <= lines; line += 1) {
    treeLines.push((line % 2 === 0 ? "#" : "*").repeat(line));
  }

  treeLines.push("||");
  return treeLines.join("\n");
}

// Функция проверяет, делится ли число n без остатка одновременно на x и y.
// Возвращает true, если делится на оба числа, иначе false.
function isDivisibleBy(n, x, y) {
  return n % x === 0 && n % y === 0;
}

// Функция считает максимальное количество сэндвичей.
// Для одного сэндвича нужно:
// - 2 ломтика хлеба,
// - 1 ломтик сыра.
// Используем объект с ингредиентами и находим ограничивающий ресурс.
function countSandwiches({ bread = 0, cheese = 0 }) {
  return Math.min(Math.floor(bread / 2), cheese);
}

// Функция возвращает модуль числа без использования Math.abs().
// Если число меньше нуля, меняем знак,
// если число положительное или ноль — возвращаем как есть.
function absValue(number) {
  return number < 0 ? -number : number;
}

// Функция возвращает случайное целое число в диапазоне от min до max включительно.
// Используем Math.random(), Math.floor() и сдвиг на min.
function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Функция возвращает новый массив случайных значений из исходного массива.
// Количество элементов в новом массиве задается параметром count.
// Один и тот же элемент может встретиться несколько раз,
// так как каждый выбор происходит независимо.
function sampleArray(array, count) {
  const sampledValues = [];

  for (let index = 0; index < count; index += 1) {
    sampledValues.push(array[randomNumber(0, array.length - 1)]);
  }

  return sampledValues;
}

// Собственная реализация метода filter.
// Функция принимает:
// - массив,
// - функцию-предикат.
// Если предикат возвращает true, элемент попадает в новый массив.
function myFilterArray(array, predicate) {
  const filteredArray = [];

  for (const item of array) {
    if (predicate(item)) {
      filteredArray.push(item);
    }
  }

  return filteredArray;
}

// Функция проверяет, являются ли два числа приблизительно равными.
// Это полезно для чисел с плавающей запятой, потому что из-за особенностей
// хранения дробей в памяти некоторые значения могут отличаться на очень малую величину.
// По замечанию преподавателя сравнение выполнено без дополнительного scale.
function toBeCloseTo(num1, num2) {
  return Math.abs(num1 - num2) < Number.EPSILON;
}

// Простая функция-предикат для проверки строки.
// Возвращает true, если строка начинается с буквы 'V'.
function isFirstV(name) {
  return name.startsWith("V");
}

// Демонстрация некоторых методов массива.
// Здесь показывается работа push/pop и shift/unshift,
// а также два способа перебора массива: for..of и forEach.
function logArrayMethodsDemo() {
  const array = [1, 2, 3];

  // Добавили элемент в конец массива.
  array.push(4);
  // Удалили последний элемент массива.
  array.pop();
  // Добавили элемент в начало массива.
  array.unshift(0);
  // Удалили первый элемент массива.
  array.shift();

  // Перебор элементов массива через for..of.
  for (const item of array) {
    logValue(`for..of item: ${item}`);
  }

  // Перебор элементов массива через forEach.
  array.forEach((item, index) => {
    logValue(`forEach ${index}: ${item}`);
  });
}

// Демонстрация работы с объектом.
// Здесь показываются:
// - удаление свойства через delete,
// - получение ключей,
// - получение значений,
// - получение пар [ключ, значение].
function logObjectMethodsDemo() {
  const object = { a: 1, b: 2, c: 3 };

  delete object.b;
  logValue(Object.keys(object));
  logValue(Object.values(object));
  logValue(Object.entries(object));
}

// Демонстрация некоторых свойств и методов объекта Math.
function logMathDemo() {
  logValue(`Math.PI = ${Math.PI}`);
  logValue(`Math.sqrt(9) = ${Math.sqrt(9)}`);
}

// Ниже идут тестовые вызовы всех функций.
// Они нужны для проверки корректности работы решений
// и для демонстрации вывода в консоли браузера.

logSection("convertTemperature");
logValue(convertTemperature(32, "toC"));
logValue(convertTemperature(10, "toF"));
logValue(convertTemperature(100, "toC"));

logSection("triangle");
logTriangleInfo(3, 4, 5);
logTriangleInfo(1, 2, 10);

logSection("fizz-buzz");
logFizzBuzz(10);

logSection("tree");
logValue(buildTree(12));

logSection("division");
logValue(`n = 3, x = 1, y = 3 => ${isDivisibleBy(3, 1, 3)}`);
logValue(`n = 12, x = 2, y = 6 => ${isDivisibleBy(12, 2, 6)}`);
logValue(`n = 100, x = 5, y = 3 => ${isDivisibleBy(100, 5, 3)}`);
logValue(`n = 12, x = 7, y = 5 => ${isDivisibleBy(12, 7, 5)}`);

logSection("sandwiches");
logValue(countSandwiches({ bread: 5, cheese: 6 }));
logValue(countSandwiches({ bread: 4, cheese: 1 }));

logSection("absValue");
logValue(absValue(-2));
logValue(absValue(100));
logValue(absValue(0));

logSection("randomNumber");
logValue(randomNumber(0, 10));
logValue(randomNumber(-10, 10));

logSection("sampleArray");
logValue(sampleArray([1, 2, 3, 4], 2));
logValue(sampleArray([1, 2, 3, 4], 3));

logSection("array methods demo");
logArrayMethodsDemo();

logSection("myFilterArray");
logValue(myFilterArray(["Short", "VeryLong", "Vivid"], isFirstV));

logSection("object methods demo");
logObjectMethodsDemo();

logSection("Math demo");
logMathDemo();

logSection("toBeCloseTo");
logValue(toBeCloseTo(0.1 + 0.2, 0.3));
logValue(toBeCloseTo(0.1, 0.1000001));
