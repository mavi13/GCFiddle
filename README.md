# GCFiddle - Fiddle with Geocaching Waypoints

GCFiddle is a tool to compute waypoints for geocaching (https://www.geocaching.com/) and show them on a map.
It has a build-in interpreter for a simple calculation language similar to the "Wolf Language"
used by CacheWolf (http://cachewolf.aldos.de/index.php/Main/HomePage).

A running example can be found here: https://mavi13.github.io/GCFiddle/gcfiddle.html

## Features

 - Calculation language similar to "Wolf Language" used by CacheWolf's solver
 - Modifying variables temporarily and see its effect on the calculation
 - Show waypoints on a simple map or with Google Maps
 - Loading of geocache calculation scripts out sorted in categories
 - Runs locally without a server, also on mobile devices
 - HTML5 / JavaScript without external libraries

## Usage

 - Simply open gcfiddle.html in a browser.
   The user interface shows several boxes which can be shrunk and expanded by pressing the green buttons.
   There are boxes for input, output, variable, note, waypoint and map.

### Input box

 - The first selection field sets the category of the geocache, e.g. "Test", "To Find" or "Found".
   Categories are mapped to directories where the calculation scripts for geocaches reside.
 - The second selection field loads a geocache calculation script and executes it
 - The input field contains the editable script
 - The "Execute" button executes the input script and fills the other boxes with the output
 - The "Preprocess" button processes the input text (not a script but a textual geocache description) and
   tries to convert it to a script. This means it comments lines and tries to find variables and waypoints.
   To execute the output, it must be copied into the input field.
 - The "Reload" button reloads the page with the current settings. (Please note that changes to the script are lost!)
   See the list of URL parameters below.

### Output box

 - Shows the output of the script execution or text (pre-) processing
 - If you mark a variable or a waypoint, it will be selected in the variable box or in the waypoint box, respectively

### Variable box

 - Allows you to select a variable that is found during script execution and fiddle with it.
   That means you can change it temporarily without changing the script.
   Changed variables are marked with "[c]".
 - Also, the general view type of the variable can be changed. If a variable is not a number, it is displayed as text.
   The range slider currently uses the interval 0 to 9999.

### Note box

 - Allows you to write some notes

### Waypoint box

 - Allows you to select a waypoint found during script execution and fiddle with it. That means you can change it temporarily without changing the script.
   Changed waypoints are marked with "[c]".
 - Waypoints are variables that begin with a dollar sign "$".

### Map box
 - Allows you to show waypoints on a map.
 - The selection field selects a simple map (offline) or Google Maps (online).
 - When using Google Maps: Get a Google API key and set it in gcfiddle.js, in gcconfig.js or as a URL parameter.
   Clicking on a waypoint opens an info box with coordinates.
   When you move the waypoint around, the coordinates in the information box are updated. Clicking on "x" closes the info box.
   Zooming and moving the map are also possible.

## Calculation language

 - Line comments start with a hash "#"
 - Numbers are composed of digits 0..9 and an optional decimal point
 - Strings are surrounded by quotations '"' or by apostrophes "'". Special characters in strings are not interpolated
 - Strings are concatenated if they are enclosed in brackets "[" and "]"
 - Type conversion is performed as required, e.g. numbers in brackets "[" and "]" are converted to strings
 - Operators +, -, *, / % ^ are used for for numerical addition, subtraction, multiplication, division, modulo and exponential operation.
   Strings are first converted into numbers. Parenthesis "(", ")" can be used as usual.
 - Functions can be defined f()=3.14 or called: f()
 - Functions can have multiple parameters: f(x,y)=x*y

### List of predefined functions

#### Trigonometric functions
 - sin(d): sine of a number d given in degrees (Math.sin)
 - cos(d): cosine of a number d given in degrees (Math.cos)
 - tan(d): tangent of a number d given in degrees (Math.tan)
 - asin(x): arcsine (in degrees) of a number x (Math.asin)
 - acos(x): arccosine (in degrees) of a number x (Math.acos)
 - atan(x): arctangent (in degrees) of a number x (Math.atan)
 - r2d(r): convert radians to degrees (r * 180 / Math.PI)
 - d2r(d): convert degrees to radians (d * Math.PI / 180)
 
 #### Numeric functions

 - abs(x): absolute value of number x (Math.abs)
 - round(x): round x to nearest integer (Math.round)
 - ceil(x): ceiling function: round x to nearest integer >= x (Math.ceil)
 - floor(x): floor function:  round x to nearest integer <= x (Math.floor)
 - int(x): integer value of x (Math.floor for x > 0, otherwise Math.ceil; same as Math.trunc with ES6)
 - mod(x,y): (x % y)
 - log(x): natural logarithm (base E) of a number x (Math.log)
 - exp(x): exponential function e ^ x (Math.exp)
 - sqrt(x): square root of a number x (Math.sqrt)
 - min(x,y): minimum of numbers x and y (Math.min)
 - max(x,y): maximum of numbers x and y (Math.max)
 - random(): pseudo-random number [0, 1) (Math.random)
 - gcd(x,y): greatest common divisor of x and y
 - fib(n): the nth Fibonacci number, the sum of the two preceding ones
 - ct(n): crosstotal of the number n; sum of digits
 - cti(n): crosstotal iterative of the number n; sum of digits until < 10
 - val(s): sum of the character values
 - sval(s): list of the character values
 - encode(s, m1, m2): encode s with character mapping m1 to m2
 - instr(s, s2): Index of s2 in s, starting at 1; 0=not found (String.indexOf + 1)
 - len(s): length of string s (String.length)
 - count(s, c): count characters in string
 - mid(s, index, len): substring with index starting at 1 and length
 - uc(s): uppercase string (caution: Chrome converts "ß" to "SS"!) (String.toUpperCase)
 - lc(s): lowercase string (String.toLowerCase)
 - replace(s, find, rep): replace all occurrences of "find" by "rep" (String.replace)
 - reverse(s): (String.reverse)
 - rot13(s): rotate the alphabet by 13 positions
 - zformat(n, len): zero padding
 - isEqual(x, y): ...
 - getConst(type): Get constant Math.PI or Math.E
 - assert(s1, s2): asserts that s1 is equal to s2
 - parse(s): Parses script in s; returns output and possible error messages
 - cls(): clear output
 - ic(x): no effect (WolfLanguage: Ignore case)

#### Waypoint computations (based on coordinate format dmm, e.g. "N 49° 16.130 E 008° 40.453")

 - bearing(w1, w2): Bearing in degrees
 - cb(w1, b1, w2, b2): Crossbearing
 - distance(w1, w2): Distance in meters
 - project(w1, angle, distance): Project from w1 angle degrees distance meters
 - midpoint(w1, w2): Midpoint between w1 and w2
 - format(w1, fmt): Format waypoint w1 (dmm, dms, dd)

### Differences in the calculation language of GCFiddle and WolfLanguage from CacheWolf

 - Most of the functions are also available in CacheWolf, so it is possible to write calculation stripts for both.
 - Please see the examples on the test page "test/GCTEST1.js".
 - A description of the WolfLanguage (only in German) can be found at: http://cachewolf.aldos.de/index.php/Doku/WolfLanguage

#### Some differences when using GCFiddle

 - Strings can be surrounded by quotations '"' or by apostrophes "'". Special characters in strings are not interpolated.
 - To concatenate strings, they must be placed in brackets "[", "]". Separation by spaces is not enough
 - Variables are case-sensitive (In WolfLanguage this can be set with ic(0))
 - Possibility to define new functions, e.g. s(x, y)=x+y
 - Number formatting with zformat()  (not with "3.14159:000.00:"  ="003.14")
 - Geodetic calculation of waypoints uses another model with other formulas, so there are slightly different results
 - No statement separator, especially no semicolon ";"
 - Functions must be used exactly as they are defined, there are no abbreviations or aliases (e.g. crosstotal is always ct)
 - No error check for incorrect number of arguments for functions
 - No function: goto(wp)
 - No statements: IF, THEN, ENDIF, STOP

## URL parameters as settings

 - Settings can be some of the following URL parameters:
 - exampleIndex=test | tofind | found // Set the example index or category (directory exampleIndex must exist and must contain an index file 0index.js)
 - example=GCNEW1 // Load example
 - showInput: true // Show the input box
 - showOutput=true // Show the output box
 - showVariable=true // Show the variable box
 - showNote=true, // Show the notes box
 - showWaypoint=true // Show waypoint box
 - showMap=true //Sshow the map box
 - variableType=number | text | range // General type of variables. If a variable is not a number, text is used.
 - mapType=simple | google // Type of map
 - key=... // Google API key
 - zoom=15 // Initial zoom level for Google Maps (usually automatically set)
 - debug=0 // Debug level, 0=off, 1=some, 2=some more,...
 - showConsole=false // Can be set to "true" for debugging messages

#### mavi13, 2017