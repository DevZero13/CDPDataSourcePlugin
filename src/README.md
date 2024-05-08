<!-- This README file is going to be the one displayed on the Grafana.com website for your plugin -->

# CDP

Front-end data source plugin for fetching realtime data from CDP.

## Setting Up the CDP Data Source

Look for 'CDP' in plugins library and add it as data source.
Configure 'host' attribute to match CDP application you would like to fetch data from.
Check the CDP application output and refer to StudioAPIServer ip and port. 
When CDP application is run locally, it usually is 127.0.0.1:7689.

Grafana Live must be enabled from settings menu for dashboards to refresh continuously.

## Using the CDP Data Source
From panel query settings select CDP as data source and specify CDP Routing in query attributes.
For dynamic dashoards use Grafana variables.

