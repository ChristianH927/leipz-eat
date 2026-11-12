# Leipzig Bites – gemeinsame Abstimmung freischalten

Die Abstimmung ist im Website-Design und in `votes.js` integriert. Sie nutzt Firebase Realtime Database, damit alle Besucher dieselben Live-Ergebnisse sehen. Die statische GitHub-Website kann ohne eine externe Datenbank keine gemeinsamen Stimmen speichern.

## Einmalige Einrichtung

1. Unter https://console.firebase.google.com/ ein **eigenes neues Projekt** für Leipzig Bites erstellen (kostenloser Spark-Tarif genügt bei kleiner privater Nutzung).
2. Unter **Project settings → Your apps → Web-App** eine Web-App registrieren. Kopiere das angezeigte `firebaseConfig`-Objekt.
3. **Build → Authentication → Sign-in method → Anonymous** aktivieren. So können Gäste ohne Anmeldung abstimmen; jeder Browser erhält eine pseudonyme Benutzer-ID.
4. **Build → Realtime Database → Create database** auswählen. Die dabei angezeigte `databaseURL` muss in der Konfiguration enthalten sein.
5. Unter **Realtime Database → Rules** diese Regeln eintragen und veröffentlichen:

```json
{
  "rules": {
    "leipz-eat": {
      "votes": {
        ".read": true,
        "$uid": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.hasChildren(['name', 'spot', 'updated'])",
          "name": {
            ".validate": "newData.isString() && newData.val().length >= 2 && newData.val().length <= 30"
          },
          "spot": {
            ".validate": "newData.isNumber() && newData.val() >= 1 && newData.val() <= 8"
          },
          "updated": {
            ".validate": "newData.isNumber()"
          },
          "$other": {
            ".validate": false
          }
        }
      }
    }
  }
}
```

6. In `firebase-config.js` das `null` durch das Konfigurationsobjekt der Web-App ersetzen, einschließlich `databaseURL`, und die Datei committen:

```js
export const firebaseConfig = {
  apiKey: "…",
  authDomain: "…",
  databaseURL: "https://….firebasedatabase.app",
  projectId: "…",
  appId: "…"
};
```

## Datenschutzhinweis und Grenzen

- Nutzer geben freiwillig einen Namen ein; der Name und die Restaurantwahl sind für alle Seitenbesucher sichtbar.
- Es wird keine Privatadresse für Domdidom gespeichert oder angezeigt. Die Entfernungsangaben sind statische Schätzungen.
- Jede anonyme Firebase-Browseridentität darf nur ihre eigene Stimme verändern oder löschen. Nach Löschen der Browserdaten ist eine erneute Stimme möglich. Das ist **kein manipulationssicheres Wahlverfahren**.
- Das Formular verhindert doppelte Namen nach bestem Wissen, bietet aber keinen global garantiert einmaligen Namen; für einen privaten Ausflug reicht das gewöhnlich.
- Firebase-Web-Konfiguration ist kein geheimer Administratorschlüssel. Schutz der Daten erfolgt über die Security Rules; niemals Service-Account-Private-Keys ins Repository schreiben.
- Wenn `firebase-config.js` noch `null` enthält, sieht man nur den Hinweis „Abstimmung wird eingerichtet“ und keine irreführende lokale Scheinabstimmung.

## GitHub Pages

Repository → **Settings → Pages → Build and deployment: Deploy from a branch**, Branch **main**, Folder **/(root)** → Save. Anschließend sollte die Seite unter https://christianh927.github.io/leipz-eat/ erreichbar sein.
