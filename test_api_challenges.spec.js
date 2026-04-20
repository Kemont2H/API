const { test, expect } = require('@playwright/test');
const { request } = require('http');
test.describe.configure({ mode: 'serial' });
const BASE_URL = 'https://apichallenges.eviltester.com';
const CHALLENGER_ID = 'bf5989bc-4ad4-4bef-a20a-54bd0d1f9873';

test.beforeAll(async ({ request }) => {
    // Очищаем все задачи перед запуском тестов
    const getResp = await apiRequest(request, 'get', '/todos');
    const todos = (await getResp.json()).todos;
    
    for (const todo of todos) {
      await apiRequest(request, 'delete', `/todos/${todo.id}`);
    }
    console.log(`Очищено ${todos.length} задач перед тестами`);
  });

const apiRequest = async (request, method, path, options = {}) => {

    const headers = {
'X-CHALLENGER': CHALLENGER_ID,
    // Оператор spread (...) копирует все заголовки из options.headers
    // Если в options есть свои заголовки, они добавятся сюда
    ...options.headers,
  };
  return await request[method](`${BASE_URL}${path}`, { ...options, headers });
};

test('01 - POST /challenger (201) - создать новую сессию', async ({ request }) => {

    const response = await apiRequest(request, 'post', '/challenger');
    
    expect(response.status()).toBe(200);

    const challengerHeader = response.headers()['x-challenger'];

    console.log('Ваш UUID:', challengerHeader);

    expect(challengerHeader).toBeDefined();

    expect(challengerHeader.length).toBeGreaterThan(0);
  });

  test('02 - GET /challenges (200) - получить список всех челленджей', async ({ request }) => {
    // GET запрос на /challenges
    const response = await apiRequest(request, 'get', '/challenges');
    
    // Ожидаем статус 200 (OK - успешно)
    expect(response.status()).toBe(200);
    
    // response.json() - парсит тело ответа из JSON в JavaScript объект
    // await - ждём окончания парсинга
    const body = await response.json();
    
    // .toHaveProperty('challenges') - проверяет, что у объекта есть поле 'challenges'
    expect(body).toHaveProperty('challenges');
    
    // Array.isArray() - проверяет, является ли значение массивом
    // .toBeTruthy() - проверяет, что результат true (т.е. это массив)
    expect(Array.isArray(body.challenges)).toBeTruthy();
    
    // .length - свойство массива, количество элементов
    // .toBeGreaterThan(0) - проверяем, что массив не пустой
    expect(body.challenges.length).toBeGreaterThan(0);
    
    // Берём первый элемент массива challenges (индекс 0)
    const firstChallenge = body.challenges[0];
    
    // У каждого челленджа должно быть поле id
    expect(firstChallenge).toHaveProperty('id');
    
    // Поле description (описание челленджа)
    expect(firstChallenge).toHaveProperty('description');
    
    // Поле done (выполнен или нет, true/false)
    expect(firstChallenge).toHaveProperty('status');
  });

  test('03 - GET /todos (200) - запрос к todos', async ({ request }) => {
    const response = await apiRequest(request, 'get', '/todos');
    
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty('todos');

    expect (Array.isArray(body.todos)).toBeTruthy();

    if(body.todos.length > 0) {
        const todo = body.todos[0];

        expect(todo).toHaveProperty('id');
        expect(todo).toHaveProperty('title');
        expect(todo).toHaveProperty('description');
        expect(todo).toHaveProperty('doneStatus')
    }
});

test('04 - GET /todo (404) - не множественное число', async ({ request }) => {
    const response = await apiRequest(request, 'get', '/todo');
    
    expect(response.status()).toBe(404);
});

test('05 - GET /todos/{id} (200) - получить конкретную задачу по ID', async ({ request }) => {
    // ШАГ 1: Очищаем все существующие задачи
    const getResp = await apiRequest(request, 'get', '/todos');
    const existingTodos = (await getResp.json()).todos;
    
    for (const todo of existingTodos) {
      await apiRequest(request, 'delete', `/todos/${todo.id}`);
    }
    
    // ШАГ 2: Создаём новую задачу
    const createResp = await apiRequest(request, 'post', '/todos', {
      data: { title: 'Test for ID retrieval' }
    });
    
    expect(createResp.status()).toBe(201);
    
    const createBody = await createResp.json();
    const todoId = createBody.id;
    
    // ШАГ 3: Получаем задачу по ID
    const response = await apiRequest(request, 'get', `/todos/${todoId}`);
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.todos[0].id).toBe(todoId);
    expect(body.todos[0].title).toBe('Test for ID retrieval');
  });

  test('06 - GET /todos/{id} (404) - несуществующий ID', async ({ request }) => {
    const nonExistentId = 999999;
    const response = await apiRequest(request, 'get', `/todos/${nonExistentId}`);
    
    expect(response.status()).toBe(404);
  });

  test('07 - GET /todos?doneStatus=true (200) - фильтр по выполненным задачам', async ({ request }) => {
    await apiRequest(request, 'post', '/todos', {
      data: { title: 'Completed task', doneStatus: true }
    });
    await apiRequest(request, 'post', '/todos', {
      data: { title: 'Not completed task', doneStatus: false }
    });
    
   
    const response = await apiRequest(request, 'get', '/todos?doneStatus=true');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    
  
    for (const todo of body.todos) {
      expect(todo.doneStatus).toBe(true);
    }
  });

  test('08 - HEAD /todos (200) - заголовок и код ', async ({ request }) => {
  
    const response = await apiRequest(request, 'head', '/todos');
    expect(response.status()).toBe(200);
  });

  test('10 - POST /todos (400) - Невалидный статус ', async ({ request }) => {
    
    await apiRequest(request, 'post', '/todos', {
        data: { title: 'Completed task', doneStatus: 'invalid' }
    });
    const response = await apiRequest(request, 'post', '/todos?doneStatus');
    expect(response.status()).toBe(400);
    const body = await response.json();
    });

    test('11 - POST /todos (400) - Длинный заголовок', async ({ request }) => {
        const payload = {
          title: 'A'.repeat(300),
          doneStatus: false,
        };
        
        const response = await apiRequest(request, 'post', '/todos', {
          data: payload,
        });
        
        expect(response.status()).toBe(400);
        
      });

      test('12 - POST /todos (400) - Длинное описание', async ({ request }) => {
        const payload = {
          description: 'A'.repeat(1000),
          doneStatus: false,
        };
        
        const response = await apiRequest(request, 'post', '/todos', {
          data: payload,
        });
        
        expect(response.status()).toBe(400);
        
      });

      test('13 - POST /todos (201) - Максимальное значение заголовка и описания', async ({ request }) => {
        const payload = {
            title: 'A'.repeat(50),
            description:'B'.repeat(200),
            doneStatus: true,
        };

        const response = await apiRequest(request, 'post', '/todos',{
            data: payload,
        });

        expect(response.status()).toBe(201);
      });


      test('15 - POST /todos (400) - Нераспознанный объект', async ({ request }) => {
        const payload = {
          title: 'b',
          description: 'a',
          priority: 'maximum',
          doneStatus: false,
        };
        
        const response = await apiRequest(request, 'post', '/todos', {
          data: payload,
        });
        
        expect(response.status()).toBe(400);
        
        const body = await response.json();
      });

      test('16 - PUT /todos{id} (400) - Неудачное создание задачи', async ({ request }) => {
      const payload = {
        title: 'Try to create with PUT',
        doneStatus: 'false',
        };

        const response = await apiRequest(request, 'put', '/todos/999999', {
          data: payload,
        });

        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.errorMessage).toBeDefined;
      });

      test('17 - POST /todos/{id} (200) - успешное обновление задачи', async ({ request }) => {
        // Создаём исходную задачу
        const createResp = await apiRequest(request, 'post', '/todos', {
          data: { title: 'Original title', doneStatus: false },
        });
        const todoId = (await createResp.json()).id;
        
        // Обновляем только заголовок (частичное обновление)
        const response = await apiRequest(request, 'post', `/todos/${todoId}`, {
          data: { title: 'Updated title' },  // Отправляем ТОЛЬКО title
        });
        
        expect(response.status()).toBe(200);
        
        const body = await response.json();
        
        // Заголовок изменился
        expect(body.title).toBe('Updated title');
        // Статус НЕ изменился
        expect(body.doneStatus).toBe(false);
      });

      test('19 - PUT /todos/{id} (200) - полное обновление', async ({ request }) => {
        // Создаём задачу с начальными данными
        const createResp = await apiRequest(request, 'post', '/todos', {
          data: { 
            title: 'Old full', 
            description: 'Old desc', 
            doneStatus: false 
          },
        });
        const todoId = (await createResp.json()).id;
        
        // Отправляем PUT с НОВЫМИ данными (полный объект)
        const payload = {
          title: 'New full title',
          description: 'New full description',
          doneStatus: true,
        };
        
        const response = await apiRequest(request, 'put', `/todos/${todoId}`, {
          data: payload,
        });
        
        expect(response.status()).toBe(200);
        
        const body = await response.json();
        
        // Проверяем, что ВСЕ поля обновились
        expect(body.title).toBe(payload.title);
        expect(body.description).toBe(payload.description);
        expect(body.doneStatus).toBe(payload.doneStatus);
      });

      test('20 - PUT /todos/{id} (200) - только обязательные поля', async ({ request }) => {
        
        const createResp = await apiRequest(request, 'post', '/todos', {
          data: { 
            title: 'Original', 
            description: 'Original desc', 
            doneStatus: false 
          },
        });
        const todoId = (await createResp.json()).id;
        
        // Отправляем PUT только с title (обязательное поле)
        const response = await apiRequest(request, 'put', `/todos/${todoId}`, {
          data: { title: 'Only title updated' }, 
        });
        
        expect(response.status()).toBe(200);
        
        const body = await response.json();
        
        // Title обновился
        expect(body.title).toBe('Only title updated');
        
      
        expect(body.description).toBe('');  
        expect(body.doneStatus).toBe(false);  
      });
      test('21 - PUT /todos/{id} (400) - нет обязательного поля title', async ({ request }) => {
        const createResp = await apiRequest(request, 'post', '/todos', {
          data: { title: 'Original', doneStatus: false },
        });
        const todoId = (await createResp.json()).id;
        
        const response = await apiRequest(request, 'put', `/todos/${todoId}`, {
          data: { doneStatus: true },
        });
        

        expect(response.status()).toBe(400);
      });
       
      test('22 - PUT /todos/{id} (400) - нельзя изменить payload', async ({ request }) => {
        const createResp = await apiRequest(request,'post', '/todos', {
          data: { title: 'Title', doneStatus: false},
        });
        const todoId = (await createResp.json()).id;

        const response = await apiRequest(request, 'put', `/todos/${todoId}`, {
          data: {
            title: 'New title',
            id:9999, 
          },
        });
  

      expect(response.status()).toBe(400);
      const body = await response.json();
      });
 

      test('24 - OPTIONS /todos/ (200) - проверить Allow header', async ({ request }) => {
        
        const response = await fetch(`${BASE_URL}/todos`, {
          method: 'OPTIONS',
          headers: {
            'X-CHALLENGER': CHALLENGER_ID,
          },
        });
        
        expect(response.status).toBe(200);
        
        const allowHeader = response.headers.get('allow');
        expect(allowHeader).toBeDefined();
        
               // Разбиваем строку на массив методов
        // .split(',') - разбивает строку по запятым
        // .map(m => m.trim()) - удаляет пробелы у каждого метода
        const allowedMethods = allowHeader.split(',').map(m => m.trim());

        // .toContain() - проверяет, что массив содержит указанное значение
        expect(allowedMethods).toContain('GET');
        expect(allowedMethods).toContain('POST');
        expect(allowedMethods).toContain('OPTIONS');
      });

      test('25 - GET /todos с Accept: application/xml (200) - получить XML', async ({ request }) => {
        const response = await apiRequest(request, 'get', '/todos', {
          headers: { 'Accept': 'application/xml' },
        });
        
        expect(response.status()).toBe(200);
        
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('xml');
        
        const bodyText = await response.text();
        
        // Проверяем, что это XML (наличие корневого тега)
        expect(bodyText.trim().startsWith('<todos>')).toBeTruthy();
      });


      test('26 - GET /todos с Accept: application/json (200) - получить json', async ({ request }) => {
        const response = await apiRequest(request, 'get', '/todos', {
          headers: { 'Accept': 'application/json' },
        });
        
        expect(response.status()).toBe(200);

        
        const body = await response.json();
        
      
      });

      test('28 - GET /todos с Accept: application/xml, application/json (200) - Предпочтительней xml', async ({ request }) => {
        const response = await apiRequest(request, 'get', '/todos', {
          headers: { 
            'Accept': 'application/xml, application/json'  
          },
        });
      
        expect(response.status()).toBe(200);
      
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('xml');
      });

      test('29 - GET /todos без Accept header (200) - JSON по умолчанию', async ({ request }) => {
        // Отправляем запрос БЕЗ заголовка Accept
        const response = await request.get(`${BASE_URL}/todos`, {
          headers: {
            'X-CHALLENGER': CHALLENGER_ID,
            // Accept отсутствует намеренно
          },
        });
        
        expect(response.status()).toBe(200);
        
        // Проверяем, что сервер вернул JSON (формат по умолчанию)
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('json');
      });


      test('30 - GET /todos  (406) - application/gzip  ', async ({ request }) => {
        const response = await apiRequest(request, 'get', '/todos', {
          headers: { 
            'Accept': 'application/gzip',  
          },
        });
      
        expect(response.status()).toBe(406);
        const body = await response.json();
        expect(body.errorMessages).toBeDefined();
      });

      test('31 - POST /todos с XML Content-Type (201) - создать через XML', async ({ request }) => {
        const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
          <todo>
            <title>XML Created Todo</title>
            <doneStatus>false</doneStatus>
          </todo>`;
        
        const response = await apiRequest(request, 'post', '/todos', {
          headers: {
            'Content-Type': 'application/xml',
            'Accept': 'application/xml',
          },
          data: xmlBody,
        });
        
        // Принимаем 200 или 201 (оба означают успех)
        expect([200, 201]).toContain(response.status());
        
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('xml');
      });
    
      test('32 - POST /todos с JSON Content-Type (201) - создать через JSON', async ({ request }) => {
        const jsonBody = {
          title: 'JSON Created Todo',
          doneStatus: false,
        };
        
        const response = await apiRequest(request, 'post', '/todos', {
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          data: jsonBody,
        });
        expect([200, 201]).toContain(response.status());
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('json');
      });

      test('33 - POST /todos (415) - неподдерживаемый Content-Type', async ({ request }) => {
        const response = await apiRequest(request, 'post', '/todos', {
          headers: { 'Content-Type': 'application/pdf' },
          data: 'some pdf data',
        });
      
        expect(response.status()).toBe(415);
      
        const body = await response.json();
        
        expect(body.errorMessages).toBeDefined();
        expect(Array.isArray(body.errorMessages)).toBeTruthy();
        
        
        expect(body.errorMessages[0].toLowerCase()).toContain('unsupported');
      });


      test('34 - GET /challenger/{guid} (200) - получить прогресс', async ({ request }) => {
        const response = await apiRequest(request, 'get', `/challenger/${CHALLENGER_ID}`);
      
        expect(response.status()).toBe(200);
      
        const body = await response.json();
      
       
        expect(body).toHaveProperty('challengeStatus');
        expect(body).toHaveProperty('xChallenger');
        expect(body).toHaveProperty('secretNote');
        expect(body).toHaveProperty('xAuthToken');
        
        // Проверяем, что UUID совпадает
        expect(body.xChallenger).toBe(CHALLENGER_ID);
        
        // challengeStatus должен быть объектом
        expect(typeof body.challengeStatus).toBe('object');
      });

      test('35 - PUT /challenger/{guid} (200) - восстановить прогресс', async ({ request }) => {
        const getResp = await apiRequest(request, 'get', `/challenger/${CHALLENGER_ID}`);
        const progressData = await getResp.json();
        
        const response = await apiRequest(request, 'put', `/challenger/${CHALLENGER_ID}`, {
          data: progressData,
        });
        
        expect(response.status()).toBe(200);
        
        const body = await response.json();
        
        // Проверяем, что вернулся объект с challengeStatus
        expect(body).toHaveProperty('challengeStatus');
        expect(body).toHaveProperty('xChallenger');
        expect(body.xChallenger).toBe(CHALLENGER_ID);
      });

      test('36 - PUT /challenger/{guid} (200) - создать новый прогресс', async ({ request }) => {
        // Генерируем новый валидный UUID
        const crypto = require('crypto');
        const newGuid = crypto.randomUUID();
        
        // Создаём структуру прогресса (как в документации)
        const mockProgress = {
          challengeStatus: {},
          secretNote: "",
          xAuthToken: "",
          xChallenger: newGuid,
        };
      
        const response = await apiRequest(request, 'put', `/challenger/${newGuid}`, {
          data: mockProgress,
        });
      
        // PUT создаёт новый ресурс → 201 Created
        // ИЛИ обновляет существующий → 200 OK
        expect([200, 201]).toContain(response.status());
      });
      
      test('37 - GET /challenger/database/{guid} (200) - Получить текущую базу данных', async ({ request }) => {
        const response = await apiRequest(request, 'get', `/challenger/database/${CHALLENGER_ID}`);
        
        expect(response.status()).toBe(200);
        
        const body = await response.json();
        expect(body).toHaveProperty('todos');
        expect(Array.isArray(body.todos)).toBeTruthy();
      });

      test('38 - PUT /challenger/database/{guid} (204) - Обновить базу данных', async ({ request }) => {
        const getResp = await apiRequest(request, 'get', `/challenger/database/${CHALLENGER_ID}`);
        const databaseData = await getResp.json();

        const response = await apiRequest(request, 'put', `/challenger/database/${CHALLENGER_ID}`, {
          data: databaseData,
      });
        expect(response.status()).toBe(204);
      });


      test('39 - POST /todos (201) - отправить XML, получить JSON', async ({ request }) => {
        const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
        <todo>
          <title>XML to JSON Todo</title>
          <doneStatus>false</doneStatus>
        </todo>`;

        const response = await apiRequest(request, 'post', '/todos', {
          headers: {
            'Content-type': 'application/xml',
            'Accept': 'application/json',          
        },
        data: xmlBody,
      });

      expect(response.status()).toBe(201);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('json');

      const body = await response.json();
      expect(body.title).toBe('XML to JSON Todo');
    });

    test('40 - POST /todos JSON to XML (201) - отправить JSON, получить XML', async ({ request }) => {
      const jsonBody = {
        title: 'JSON to XML Todo',
        doneStatus: false,
      };
      
      const response = await apiRequest(request, 'post', '/todos', {
        headers: {
          'Content-Type': 'application/json',   // Отправляем JSON
          'Accept': 'application/xml',          // Хотим получить XML
        },
        data: jsonBody,
      });
      
      expect(response.status()).toBe(201);
      
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('xml');
      
      const xmlText = await response.text();
      expect(xmlText).toContain('<title>JSON to XML Todo</title>');
    });

    test('41 - DELETE /heartbeat (405) - метод не разрешён', async ({ request }) => {
      const response = await apiRequest(request, 'delete', '/heartbeat');
      
      
      expect(response.status()).toBe(405);
    });

    test('42 - PATCH /heartbeat (500) - метод не найден', async () => {
      const response = await fetch(`${BASE_URL}/heartbeat`, {
        method: 'PATCH',
        headers: {
          'X-CHALLENGER': CHALLENGER_ID,
        },
      });
      
      expect(response.status).toBe(500);
    });

    test.skip('43 - TRACE /heartbeat (501) - метод не реализован', async () => {
      // Тест пропущен из-за ограничений Playwright
      console.log('TRACE метод не поддерживается Playwright');
    });

    test('44 - GET /heartbeat (204) - сервер работает', async ({ request }) => {
      const response = await apiRequest(request, 'get', '/heartbeat');
      
      // 204 = No Content (успешно, но тело ответа пустое)
      expect(response.status()).toBe(204);
      expect(response.statusText()).toBe('');
      
      const body = await response.statusText();
  
    });

    test('45 - POST /heartbeat с X-HTTP-Method-Override: DELETE (405)', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/heartbeat', {
        headers: { 'X-HTTP-Method-Override': 'DELETE' },
      });
      
      expect(response.status()).toBe(405);
    });

    test('46 - POST /heartbeat с X-HTTP-Method-Override: PATCH (500)', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/heartbeat', {
        headers: { 'X-HTTP-Method-Override': 'PATCH' },
      });
      
      expect(response.status()).toBe(500);
    });

    test('47 - POST /heartbeat с X-HTTP-Method-Override: TRACE (501)', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/heartbeat', {
        headers: { 'X-HTTP-Method-Override': 'TRACE' },
      });
      
      expect(response.status()).toBe(501);
    });

    test('48 - POST /secret/token (401) - неверные учётные данные', async ({ request }) => {
      const wrongCredentials = Buffer.from('wrong:wrong').toString('base64');
      
      const response = await request.post(`${BASE_URL}/secret/token`, {
        headers: { 
          'Authorization': `Basic ${wrongCredentials}` 
        },
      });
      
  
      expect(response.status()).toBe(401);
    });

    test('49 - POST /secret/token (201) - верные учётные данные', async ({ request }) => {
      const correctCredentials = Buffer.from('admin:password').toString('base64');
      
      const response = await request.post(`${BASE_URL}/secret/token`, {
        headers: { 
          'Authorization': `Basic ${correctCredentials}` 
        },
      });
      
      expect(response.status()).toBe(201);
      
      // Токен приходит в заголовке x-auth-token
      const tokenFromHeader = response.headers()['x-auth-token'];
      expect(tokenFromHeader).toBeDefined();
      expect(tokenFromHeader.length).toBeGreaterThan(0);
      
      // Сохраняем токен для следующих тестов
      global.authToken = tokenFromHeader;
      console.log('Токен сохранён:', global.authToken);
    });

    test('50 - GET /secret/note (403) - неверный X-AUTH-TOKEN', async ({ request }) => {
      const response = await apiRequest(request, 'get', '/secret/note', {
        headers: { 'X-AUTH-TOKEN': 'invalid-token' },
      });
      
      expect(response.status()).toBe(403);
    });

    test('51 - GET /secret/note (401) - нет X-AUTH-TOKEN', async ({ request }) => {
      const response = await apiRequest(request, 'get', '/secret/note');
      
      expect(response.status()).toBe(401);
    });

    test('52 - GET /secret/note (200) - верный X-AUTH-TOKEN', async ({ request }) => {
      const response = await apiRequest(request, 'get', '/secret/note', {
        headers: { 'X-AUTH-TOKEN': global.authToken },
      });
      
      expect(response.status()).toBe(200);
    });

    test('53 - POST /secret/note (200) - создать заметку с X-AUTH-TOKEN', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/secret/note', {
        headers: { 'X-AUTH-TOKEN': global.authToken },
        data: { note: 'My secret note' },
      });
      expect(response.status()).toBe(200);
    });
    
    test('54 - POST /secret/note (401) - нет X-AUTH-TOKEN', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/secret/note', {
        data: {note: 'Should fall'},
        });
        expect(response.status()).toBe(401);
      });

    test('55 - POST /secret/note (403) - неверный X-AUTH-TOKEN', async ({ request }) => {
      const response = await apiRequest(request, 'post', '/secret/note', {
        headers: { 'X-AUTH-TOKEN': 'wrong token' },
        data: { note: 'Should fall' },
      });
      expect(response.status()).toBe(403);
    });  

    test('56 - GET /secret/note с Bearer токеном (200)', async ({ request }) => {
      const response = await apiRequest(request, 'get', '/secret/note', {
        headers: { 'Authorization': `Bearer ${global.authToken}`},
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('note');
    });

    test('57 - POST /secret/note с Bearer токеном (200)', async ({ request }) => {
      const response = await apiRequest (request, 'post', '/secret/note', {
        headers: { 'Authorization': `Bearer ${global.authToken}`},
        data: { note: 'Created with Bearer token'},
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.note).toBe('Created with Bearer token');
    });

    test('59 - POST максимальное количество задач (201/400)', async ({ request }) => {
      // Очищаем систему
      const getResp = await apiRequest(request, 'get', '/todos');
      const existingTodos = (await getResp.json()).todos;
      for (const todo of existingTodos) {
        await apiRequest(request, 'delete', `/todos/${todo.id}`);
      }
      
      // Правильный лимит — 20 задач
      const MAX_TODOS = 20;
      const createdIds = [];
      
      // Создаём задачи до лимита
      for (let i = 0; i < MAX_TODOS; i++) {
        const response = await apiRequest(request, 'post', '/todos', {
          data: { title: `Todo ${i + 1}`, doneStatus: false },
        });
        expect(response.status()).toBe(201);
        const body = await response.json();
        createdIds.push(body.id);
      }
      
      // Пытаемся создать 21-ю задачу (должна быть ошибка)
      const extraResponse = await apiRequest(request, 'post', '/todos', {
        data: { title: 'Extra todo that exceeds limit', doneStatus: false },
      });
      
      // Сервер возвращает 400 с сообщением о лимите
      expect(extraResponse.status()).toBe(400);
      
      const errorBody = await extraResponse.json();
      expect(errorBody.errorMessages[0]).toContain('maximum limit of 20');
      
      // Проверяем, что количество задач не превышает лимит
      const finalResp = await apiRequest(request, 'get', '/todos');
      const finalTodos = (await finalResp.json()).todos;
      expect(finalTodos.length).toBe(MAX_TODOS);
    });