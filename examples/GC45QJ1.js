/* globals gcFiddle */

"use strict";

gcFiddle.addItem("", function () { /*
$GC45QJ1="N 49° 23.372 E 008° 47.635!archived!Sinnenpfad Neckargemünd (solution)"
#https://coord.info/GC45QJ1
#
#Solution provided with friendly permission by kruemelhuepfer.
#This is an archived cache.
#
#Also listed on Opencaching.de as OCF290: https://www.opencaching.de/viewcache.php?cacheid=165185
#
# Steps how to generate this script:
# 1. Open https://coord.info/GC45QJ1 (with user logged on) and copy the complete cache description
#    Select all (ctrl-a), Copy (ctrl-c)
# 2. Open GCFiddle (https://mavi13.github.io/GCFiddle/gcfiddle.html) and paste the description into "Script" area
#    Insert: (strg-v)
# 3. Press "Preprocess" button to create a script with waypoints and variables detected
# 4. Adapt the script, press "Execute" button to see the effect. Possible adaptions:
#    - Remove all content after "#Additional Waypoints"
#    - Adapt final formula: $W16=["N 49° 2" Y/1000 " E 008° 4" Z/1000]
#    - Insert computation for X: X=A+B+C+D+E+F+G+H+I+K+L+M+N+P+Q+R
#    - Set variables, insert formulas: Crosstotal: e.g. A=ct(287), word value: e.g. C=ct(val("Douglasie")), length, e.g. K=len("Ooooooommmmmm")
#       For help press the "Help" button or chack the test page: https://mavi13.github.io/GCFiddle/gcfiddle.html?example=GC45QJ1
# 5. After pressing the "Execute" button, variables and waypoints from the script are copied to other areas on the screen and can be changed there temporary.
#    Try it to see how the final waypoint will change
#
#
$PA="N 49° 23.404 E 008° 47.727"
#
#Geocache Description:
#Kleine Wanderung bei Neckargemünd für alle Sinne.
#...
#Du benötigst unterwegs folgende zusätzliche Utensilien:
#ein Maßband oder Zollstock
#eine Schnur mit einer Länge von genau 92 cm
#einen Taschenrechner
#Beachte: An den Stationen musst du teilweise die ermittelten Zahlen runden. Es wird die kaufmännische Rundung angewandt (Abrunden < x,5 - Aufrunden bei >= x,5).
#
#Station 1: Schätzen und Fühlen (N 49° 23.372 E 008° 47.635)
#s.o. $W1="N 49° 23.372 E 008° 47.635"
#Schätze die Strecke von der ersten bis zur vierten Säule. Runde die Entfernung auf ganze Meter und nimm davon die Quersumme:
#A = ____
A=ct(287) #286.5
#Schätze den Höhenunterschied von der ersten bis zur vierten Säule. Runde die Höhe auf ganze Meter.
#B = ____
B=19 #18.72
#Station 2: Duftstation (N 49° 23.473 E 008° 47.390)
$W2="N 49° 23.473 E 008° 47.390"
#Welche Düfte sind hier zu erschnuppern? Nimm den Buchstabenwortwert des Duftes mit den meisten Buchstaben und bilde davon die Quersumme:
#C = ____
C=ct(val("Douglasie")) #kiefer, Fichte, Douglasie
#Station 3: Aussicht ins Neckartal (N 49° 23.441 E 008° 47.306)
$W3="N 49° 23.441 E 008° 47.306"
#Welche Sichthöhe in cm hat ein zehnjähriges Kind im Durchschnitt? Nimm die Quersumme:
#D = ____
D=ct(143)
#Station 4: Für Tarzan und Jane (N 49° 23.419 E 008° 47.299)
$W4="N 49° 23.419 E 008° 47.299"
#Schwinge dich am Seil den Abhang hinauf. Suche an den angegebenen Koordinaten nach einer runden Scheibe. Wie oft kannst die mitgebrachte Schnur um die Scheibe wickeln?
#E = ____ (Lösung: 7, anscheinend gab es Waldarbeiten, kann ein nachfolgender Cacher das bestätigen?)
E=7 #(Seil gefunden aber Scheibe nicht)
#Station 5: Tastsinn (N 49° 23.387 E 008° 47.193)
$W5="N 49° 23.387 E 008° 47.193"
#Wieviele Klappen findest du hier vor?
#F = ____
F=5
#Station 6: Neckarriedkopf-Nordwand (N 49° 23.315 E 008° 47.078)
$W6="N 49° 23.315 E 008° 47.078"
#Du befindest dich direkt vor der berüchtigten Neckarriedkopf-Nordwand. Auf welcher Höhe über Normalnull befindest du dich? Nimm von der Höhe die Quersumme und multipliziere sie mit 5:
#G = ____
G=ct(210)*5
#Station 7: Gnomen-Garten (N 49° 23.122 E 008° 46.790)
$W7="N 49° 23.122 E 008° 46.790"
#Wieviele Gnome siehst du? Addiere zu der Anzahl 1 hinzu.
#H = ____
H=4+1 #4+1 (5+1, 6+1 oder 10+1)
##https://www.focus.de/regional/baden-wuerttemberg/rhein-neckar-kreis-kreisforstamt-sinnenpfad-im-neckargemuender-wald-mit-neuem_id_8669160.html
##Es sind nicht alles Gnome.
#
#Station 8: Balanciervergnügen (N 49° 23.105 E 008° 46.784)
$W8="N 49° 23.105 E 008° 46.784"
#Jetzt kannst du deinen Gleichgewichtssinn testen. Damit du weißt, wie weit du balancieren musst, nimm nun das Maßband zur Hand.
#Messe die Länge des Balancierbalkens und runde deine Lösung auf volle Meter:
#I = ____
I=6 #6.42
#Station 9: Der Summstein (N 49° 22.921 E 008° 46.656)
$W9="N 49° 22.921 E 008° 46.656"
#Aus wievielen Buchstaben besteht das letzte Wort in der Beschreibung auf der Infotafel?
#K = ____
K=len("Ooooooommmmmm") #13
#Station 10: Eichhörnchen (N 49° 22.841 E 008° 46.637)
$W10="N 49° 22.841 E 008° 46.637"
#Vor welchem Tier muss sich ein Eichhörnchen in Sicherheit bringen? Ermittle den Buchstabenwortwert des gesuchten Tieres und bilde die Quersumme:
#L = ____
L=ct(val("Marder"))
#Station 11: Das Rohr (N49°22.755 E008°46.635)
$W11="N 49° 22.755 E 008° 46.635"
#Nimm dein Maßband und messe die Länge des Rohrs. Runde auf ganze Dezimeter:
#M = ____
M=6 #62.5cm also 6 dm
#Station 12: Über Stock und über Stein (N 49° 22.830 E 008° 46.643)
$W12="N 49° 22.830 E 008° 46.643"
#Aus wievielen senkrechten Baumstümpfen besteht ein Abschnitt des Barfußpfads?
#N = _____
N=10
#Station 13: Träumerliege (N 49° 22.844 E 008° 46.653)
$W13="N 49° 22.844 E 008° 46.653"
#Hier kannst du dich hinlegen, ausruhen und den Waldgeräuschen lauschen. Schau dich um und notiere dir, wieviele Träumerliegen insgesamt vorhanden sind:
#P = _____
P=4 #4 oder 8?
#Station 14: Klangvolles (N 49° 22.927 E 008° 46.659)
$W14="N 49° 22.927 E 008° 46.659"
#Versuche dich doch einmal als Musiker. Dabei kannst du auch gleich zählen, wieviele Stäbe das Xylophon hat:
#Q = _____
Q=10
#Station 15: Wood-Stone (N 49° 23.098 E 008° 46.806)
$W15="N 49° 23.098 E 008° 46.806"
#Stelle dich in den Kreis und zähle die Anzahl der großen Sandsteinblöcke:
#R = _____
R=9
#Berechnung des Finales:
#Mach es dir nun auf der nahen Bank gemütlich. Berechne zuerst die Summe aller gefundenen Zahlen:
#X = Summe (A bis R)
X=A+B+C+D+E+F+G+H+I+K+L+M+N+P+Q+R
#= ______
#Zur Kontrolle: Die iterierte Quersumme von X ist 7.
["check: " ct(ct(X)) "=7"] #auch möglich: ict(), aber nicht in CacheWolf
#
#Weiter geht's mit etwas Rechnerei:
#Y = (X * H * P) + (A + B + G + M)
Y=(X * H * P) + (A + B + G + M)
#= ________
#Z = (X * N * P) + (C * F * G) + (C + D + K)
Z=(X * N * P) + (C * F * G) + (C + D + K)
#= ________
#Das Finale findest du nun hier:
#N49°2Y.YYY E008°4Z.ZZZ
$W16=["N 49° 2" Y/1000 " E 008° 4" Z/1000]
#
#"N 49° 23.921 E 008° 47.373" mögliches Finale 1,6 km weg.
#
#
#Viel Erfolg!
#Der Cache ist auch bei Opencaching vorhanden.
#Additional Hints
#[Station 1] Ergebnis an den vierten Säule
#[Station 4] liegender Baumstamm, ungerade
#[Finale] Unter Steinen
#
#
#Additional Waypoints
#not needed
*/ });
