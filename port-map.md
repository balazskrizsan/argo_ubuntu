| SSP Port Mapping  | DEV   | DEV_NATIVE | DEVTEST | LOCAL                                                                           | UAT   | PROD  | 
|-------------------|-------|------------|---------|---------------------------------------------------------------------------------|-------|-------|
| **BE**            | :4000 | :4001      | :4002   | :4003 api--smartscrumpoker.localhost.balazskrizsan.com                          |       |       |
| **BE.psql**       | :4010 | :4011      | :4012   | :4013                                                                           |       |       |
| **BE.redis**      | :4020 | :4021      | :4022   | :4023                                                                           |       |       |
| ─────             | ───── | ─────      | ─────   | ─────                                                                           | ───── | ───── |
| **FE**            | :4030 | :4031      | :4032   | :4033                                                                           |       |       |
| ─────             | ───── | ─────      | ─────   | ─────                                                                           | ───── | ───── |
| **IDS**           | :4040 | :4041      | :4042   | :4043 ids--smartscrumpoker.localhost.balazskrizsan.com                          |       |       |
| **IDS.psql**      | :4050 | :4051      | :4052   | :4053                                                                           |       |       |
| **IDS.redis**     | :4060 | :4061      | :4062   | :4063                                                                           |       |       |
| ─────             | ───── | ─────      | ─────   | ─────                                                                           | ───── | ───── |
| **AWS SERVICES**  | :4070 | :4071      | :4072   | :4073 api--aws-services--smartscrumpoker.localhost.balazskrizsan.com            |       |       |
| ─────             | ───── | ─────      | ─────   | ─────                                                                           | ───── | ───── |
| **SLC.api**       | :4070 | :4071      | :4072   | :4073 api--semantic-log-classifier--smartscrumpoker.localhost.balazskrizsan.com |       |       |
| **SLC.api.psql**  | :4080 | :4081      | :4082   | :4083                                                                           |       |       |
| **SLC.api.redis** | :4090 | :4091      | :4092   | :4093                                                                           |       |       |
| ─────             | ───── | ─────      | ─────   | ─────                                                                           | ───── | ───── |
| **EF.api**        | :4100 | :4101      | :4102   | :4103 api--elastic-fetcher--smartscrumpoker.localhost.balazskrizsan.com         |       |       |
