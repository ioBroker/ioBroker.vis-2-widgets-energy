# Intervallwähler

![Zeitauswahl](../../img/timeSelector.png)

Tag / Woche / Monat / Jahr, zwei Pfeile zum Blättern und eine Schaltfläche **Jetzt**, die zum laufenden
Zeitraum zurückspringt. Andere Widgets folgen diesem Wähler.

## Wie andere Widgets ihn finden

Wählen Sie dieses Widget im Attribut *Widget zur Zeitintervallauswahl* eines
[Verbrauch](consumption.md)- oder [Energiekosten](energy-costs.md)-Widgets aus. Mehrere Widgets können
demselben Wähler folgen, und der Wähler darf an beliebiger Stelle derselben Ansicht liegen.

Technisch meldet sich der Wähler über das DOM an, und die Verbraucher abonnieren ihn. Weil die Reihenfolge, in
der Widgets eingehängt werden, nicht feststeht, sucht ein Verbraucher so lange, bis er den Wähler findet, und
abonniert erneut, wenn der Wähler verschoben oder neu erzeugt wird. Konfiguriert werden muss dafür nichts.

Zusätzlich und unabhängig davon schreibt der Wähler den Zeitraum in die **Ansicht**: jedes Widget der Ansicht,
das keinen eigenen Wähler benennt, folgt ihm ebenfalls.

## Konfiguration

### Allgemein

| Feld               | Bedeutung                                                                             |
| ------------------ | --------------------------------------------------------------------------------------- |
| Ohne Rahmen / Name | Karte und Titel                                                                          |
| Zeitstart-OID      | Optional. Der gewählte Beginn des Zeitraums wird hier als Zeitstempel hineingeschrieben.  |
| Zeitintervall-OID  | Optional. Die gewählte Länge wird hier abgelegt: `day`, `week`, `month` oder `year`.      |

Die beiden Objekt-IDs sind für Skripte und für andere Ansichten gedacht: sobald eine gesetzt ist, liest und
schreibt der Wähler diesen Datenpunkt, statt den Wert für sich zu behalten — ein Skript kann damit das ganze
Dashboard verschieben.

### Darstellung

| Feld                                | Bedeutung                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Tag / Woche / Monat / Jahr anbieten | Welche Schaltflächen der Wähler hat. Ist keine gewählt, werden alle vier gezeigt. |
| „Jetzt“-Schaltfläche ausblenden     | Versteckt die Schaltfläche, die zum laufenden Zeitraum zurückspringt          |
| Datumsformat                        | `24.09.2026`, `09/24/2026`, `2026-09-24` oder die Sprache des Benutzers       |

## Wochen beginnen am Montag

Eine Woche läuft von Montag bis Sonntag. Der Sonntag gehört zur endenden Woche, nicht zu der, die am nächsten
Tag beginnt.

## Rezept: ein Wähler für ein ganzes Dashboard

1. Den Wähler oben in der Ansicht platzieren, *Ohne Rahmen* ein, Höhe etwa 60 px.
2. *Jahr anbieten* ausschalten, falls eine Jahresansicht für Sie uninteressant ist.
3. In jedem Diagramm darunter den Wähler in *Widget zur Zeitintervallauswahl* auswählen.

## Fehlersuche

- **Ein Diagramm folgt dem Wähler nicht.** *Widget zur Zeitintervallauswahl* im Diagramm prüfen. Ein Diagramm
  ohne benannten Wähler folgt dem Zeitraum der Ansicht — den der Wähler zwar ebenfalls setzt, aber nur für die
  Ansicht, in der er liegt.
- **Der Pfeil nach rechts ist ausgegraut.** Sie befinden sich im laufenden Zeitraum, danach kommt nichts mehr.
- **Der Wähler springt von selbst zurück.** Ein Wechsel des Zeitraums springt immer zum laufenden, damit eine
  „Woche“, die beim Betrachten eines vergangenen Tages gewählt wurde, nicht in einem leeren Fenster landet.
