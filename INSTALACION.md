# 🛠️ Instructivo de Instalación — Refaccionaria Central

Guía para levantar el entorno de desarrollo completo: **Frontend (PHP/HTML/JS) + API REST en PHP + SQL Server**.

Arquitectura resultante:

```
Navegador → Apache (XAMPP) → API PHP → SQL Server (VM o local)
```

---

## 1. Requisitos previos

| Componente | Versión usada | Notas |
|---|---|---|
| XAMPP (Apache + PHP) | PHP **8.2.12** x64 **Thread Safe** | Descargar de [apachefriends.org](https://www.apachefriends.org) |
| SQL Server | 2012 o superior | Puede estar en otra PC o en una VM |
| Drivers PHP para SQL Server | **5.12.0** | Obligatorios para conectar PHP ↔ SQL Server |
| Microsoft ODBC Driver for SQL Server | **18** (o 17) | Puente de comunicación de PHP con SQL Server |

> [!IMPORTANT]
> Los drivers PHP deben coincidir **exactamente** con tu versión de PHP, arquitectura (x64) y modo (Thread Safe). Para verificar los tuyos, ejecuta en CMD:
> ```
> C:\xampp\php\php.exe -v
> ```

---

## 2. Instalar XAMPP

1. Instala XAMPP en `C:\xampp` (ruta por defecto).
2. **No necesitas MySQL** para este proyecto — la base de datos es SQL Server.

---

## 3. Instalar los drivers PHP para SQL Server

1. Descarga el ZIP de Windows del release **5.12.0** (compatible con PHP 8.1–8.3):
   [github.com/microsoft/msphpsql/releases/tag/v5.12.0](https://github.com/microsoft/msphpsql/releases/tag/v5.12.0) → asset `Windows_5.12.0RTW.zip`
   > Si tu PHP es 8.3+, usa el release más reciente (5.13+).
2. Extrae y copia estos dos archivos a `C:\xampp\php\ext\`:
   - `php_sqlsrv_82_ts_x64.dll`
   - `php_pdo_sqlsrv_82_ts_x64.dll`
3. Edita `C:\xampp\php\php.ini` y agrega (junto a las demás líneas `extension=`):
   ```ini
   extension=php_sqlsrv_82_ts_x64.dll
   extension=php_pdo_sqlsrv_82_ts_x64.dll
   ```
4. Verifica que carguen:
   ```
   C:\xampp\php\php.exe -m | findstr /I sqlsrv
   ```
   Debe mostrar `sqlsrv` y `pdo_sqlsrv`.

---

## 4. Instalar Microsoft ODBC Driver

Opción con winget (recomendada):
```
winget install --id Microsoft.msodbcsql.18 -e
```
O descarga el MSI desde el sitio de Microsoft: *"ODBC Driver 18 for SQL Server"*.

> [!WARNING]
> **Si tu SQL Server es 2012 sin parches (menor a SP4 + KB4057116)**, el ODBC 18 fallará con errores TLS. Instala en su lugar el **ODBC Driver 17** (`winget install Microsoft.msodbcsql.17`).

---

## 5. Configurar SQL Server (el servidor de la BD)

Todo esto se hace **en la máquina donde corre SQL Server** (VM o PC):

1. **Habilitar TCP/IP**: abrir *SQL Server Configuration Manager* (en 2012: `SQLServerManager11.msc`, en 2019: `SQLServerManager15.msc`, en 2022: `SQLServerManager16.msc`) → *SQL Server Network Configuration* → tu instancia → **TCP/IP = Enabled** → reiniciar el servicio SQL Server.
2. **Autenticación mixta**: en SSMS → clic derecho al servidor → *Properties* → *Security* → **SQL Server and Windows Authentication mode** → reiniciar el servicio.
3. **Login SQL**: crear (o habilitar) un usuario con contraseña, ej. `sa`. *Security* → *Logins* → *New Login* → modo SQL Server authentication.
4. **Firewall**: permitir entrada al puerto **1433 TCP**:
   ```
   netsh advfirewall firewall add rule name="SQL Server 1433" dir=in action=allow protocol=TCP localport=1433
   ```
5. **Red (si es VM)**: adaptador en modo **Bridged** para que tenga IP visible desde la PC de desarrollo. Se recomienda **IP estática** (con DHCP la IP cambia y rompe la conexión).

---

## 6. Crear la base de datos

1. Abre `database/script.sql` en **SQL Server Management Studio (SSMS)** y ejecútalo completo (F5).
2. El script creará la base de datos `REFACCIONARIA`, sus 18 tablas, sus 27 Procedimientos Almacenados y los datos iniciales de prueba.
3. Verifica en SSMS:
   ```sql
   USE REFACCIONARIA;
   SELECT name FROM sys.tables;   -- 18 tablas
   SELECT COUNT(*) FROM Clientes; -- Registros semilla
   SELECT * FROM Usuario;         -- Usuario 'admin'
   ```

**Credenciales del usuario inicial**: usuario `admin` con contraseña `admin123`.

---

## 7. Instalar el proyecto

1. Copia/clona el proyecto en `C:\xampp\htdocs\refa`.
2. Edita `api\config\db.php` con los datos de TU servidor SQL:
   ```php
   define('DB_HOST', '192.168.8.100'); // IP de la máquina con SQL Server (o localhost)
   define('DB_PORT', '1433');
   define('DB_NAME', 'REFACCIONARIA');  // Base de datos escolar de script.sql
   define('DB_USER', 'sa');
   define('DB_PASS', '<tu_password>');
   ```

---

## 8. Levantar y verificar

1. Abre el **XAMPP Control Panel** y arranca **Apache** (MySQL no es necesario).
2. Prueba la API directamente en el navegador o con curl:
   ```
   curl http://localhost/refa/api/clientes/
   ```
   Debes recibir JSON con `"success":true` y la lista de clientes.
3. Abre el sistema: [http://localhost/refa/](http://localhost/refa/)

---

## 9. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Error de conexión a la base de datos` | IP/credenciales mal, o SQL Server no escucha en TCP/IP | Verificar sección 5, pasos 1–4; hacer `ping <IP>` desde la PC |
| Errores de **TLS/SSL** al conectar | SQL Server 2012 sin parche de TLS 1.2 | Usar ODBC Driver **17** (sección 4) |
| Login failed for user | Falta autenticación mixta | Sección 5, paso 2 |
| Timeout / no responde | Firewall bloquea 1433 | Sección 5, paso 4 |
| La conexión funcionaba y dejó de funcionar | La VM cambió de IP (DHCP) | Actualizar `DB_HOST` o poner IP estática |
| Las tablas aparecen vacías | No se ejecutó `schema.sql` | Sección 6 |
| `class PDO ... driver not found` | Extensiones sqlsrv no cargaron | Repetir sección 3 y reiniciar Apache |

---

## 10. Estructura del proyecto

```
refa/
├── index.php / sidebar.php   ← Frontend (páginas espejo)
├── css/, js/                 ← Estilos y módulos
│   ├── api.js                ←   Helper fetch() compartido
│   ├── clientes.js           ←   CRUD conectado a la API
│   ├── proveedores.js        ←   CRUD conectado a la API
│   └── usuarios.js           ←   CRUD conectado a la API
├── api/
│   ├── config/
│   │   ├── db.php            ← Conexión PDO a SQL Server
│   │   └── http.php          ← Helpers JSON compartidos
│   ├── clientes/index.php    ← GET/POST/PUT/DELETE
│   ├── proveedores/index.php
│   └── usuarios/index.php
└── database/
    └── schema.sql            ← Esquema T-SQL + datos semilla
```

Los endpoints aceptan y devuelven **JSON**. Las operaciones de edición/eliminación usan el parámetro `?id=`, ej. `PUT /refa/api/clientes/?id=5`.

---

> [!TIP]
> Para contexto completo del diseño, revisa también `arquitectura-distribuida-refa.md`.
