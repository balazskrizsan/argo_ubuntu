| SSP Port Mapping        | DEV       | DEV_NATIVE | DEVTEST   | LOCAL                                                                     | UAT   | PROD                                      | 
|-------------------------|-----------|------------|-----------|---------------------------------------------------------------------------|-------|-------------------------------------------|
| **BE**                  | **:4000** | **:4001**  | **:4002** | **:4003** cert config map name: env-cert                                  |       | **:4003** no cert, nginx https revproxy   |
| Backend                 |           |            |           | api--smartscrumpoker.localhost.balazskrizsan.com                          |       | api.smartscrumpoker.com                   |
| **BE.psql**             | **:4010** | **:4011**  | **:4012** | **:4013**                                                                 |       | **:4013**                                 |
| **BE.redis**            | **:4020** | **:4021**  | **:4022** | **:4023**                                                                 |       | **:4023**                                 |
| ─────                   | ─────     | ─────      | ─────     | ─────                                                                     | ───── | ─────                                     |
| **FE**                  | **:4030** | **:4031**  | **:4032** | **:4033** cert config map name: env-cert                                  |       | **:4033** no cert, nginx https revproxy   |
| frontend                |           |            |           | smartscrumpoker.localhost.balazskrizsan.com                               |       | smartscrumpoker.com                       |
| ─────                   | ─────     | ─────      | ─────     | ─────                                                                     | ───── | ─────                                     |
| **IDS**                 | **:4040** | **:4041**  | **:4042** | **:4043** ids--smartscrumpoker.localhost.balazskrizsan.com                |       | **:4043** no cert, nginx https revproxy   |
| Identity service        |           |            |           |                                                                           |       | identity-service.smartscrumpoker.com      |
| Identity service        |           |            |           |                                                                           |       | api--identity-service.smartscrumpoker.com |
| **IDS.psql**            | **:4050** | **:4051**  | **:4052** | **:4053**                                                                 |       | **:4053**                                 |
| **IDS.redis**           | **:4060** | **:4061**  | **:4062** | **:4063**                                                                 |       | **:4063**                                 |
| ─────                   | ─────     | ─────      | ─────     | ─────                                                                     | ───── | ─────                                     |
| **AWS SERVICES**        | **:4070** | **:4071**  | **:4072** | **:4073** cert config map name: env-cert                                  |       | **:4073** no cert, nginx https revproxy   |
| aws services            |           |            |           | api--aws-services--smartscrumpoker.localhost.balazskrizsan.com            |       | api--aws-services.smartscrumpoker.com     |
| ─────                   | ─────     | ─────      | ─────     | ─────                                                                     | ───── | ─────                                     |
| **SLC.api**             | **:4070** | **:4071**  | **:4072** | **:4073** cert config map name: env-cert                                  |       | **:4073** no cert, nginx https revproxy   |
| semantic log classifier |           |            |           | api--semantic-log-classifier--smartscrumpoker.localhost.balazskrizsan.com |       |                                           |
| **SLC.api.psql**        | **:4080** | **:4081**  | **:4082** | **:4083**                                                                 |       | **:4083**                                 |
| **SLC.api.redis**       | **:4090** | **:4091**  | **:4092** | **:4093**                                                                 |       | **:4093**                                 |
| ─────                   | ─────     | ─────      | ─────     | ─────                                                                     | ───── | ─────                                     |
| **EF.api**              | **:4100** | **:4101**  | **:4102** | **:4103** cert config map name: env-cert                                  |       | **:4103** no cert, nginx https revproxy   |
| elastic fetcher         |           |            |           | api--elastic-fetcher--smartscrumpoker.localhost.balazskrizsan.com         |       |                                           |
| **EF.psql**             | **:4110** | **:4111**  | **:4112** | **:4113**                                                                 |       | **:4113**                                 |
