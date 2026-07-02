# ELK Config

### Log line required data

| key         | origin              | value                                                                               |
|-------------|---------------------|-------------------------------------------------------------------------------------|
| env         | logline             | dev (IDE/logback), local (k8s/fluentbit), uat (k8s/fluentbit), prod (k8s/fluentbit) |
| app         | logline             | ssp_identity_server, ssp_backend, ssp_aws_services                                  |
| k8s_pod     | logstash            | k8s pod id                                                                          |
| message     | logline             | log message                                                                         |
| level       | logline             | TRACE, DEBUG, INFO, WARN, ERROR, FATAL                                              |
| level_value | logstash if not set | TRACE: 5000, DEBUG: 10000, INFO: 20000, WARN: 30000, ERROR: 40000, FATAL: 50000     |
| long_term   | logline             | true, false                                                                         |

#### todos:
ids: level values missing, should be fixed by the logstash
delete lang everywhere
add pod to the log

### Log indexes

```
ssp-dev-logs-short-term
ssp-dev-logs-long-term
elk join filter: ssp-dev-logs*

ssp-local-logs-short-term
ssp-local-logs-long-term
elk join filter: ssp-local-logs*
```
