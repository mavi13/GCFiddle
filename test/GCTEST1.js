/* globals addExample */

"use strict";

addExample(function () { /*
#GCTEST1: Test Page
#
#
#Basic tests
a1=3.14 #Number
assert(a1, 3.14)
a2="3.14" #String
assert(a2, "3.14")
assert(a2, '3.14') #also a string

#Operator + (Numerical addition)
assert(5+3.14, 8.14) #Number+Number=Number
assert("5"+3.14, 8.14) #String+Number=Number
assert("5"+"3.14", 8.14) #String+String=Number

#String concatenation with []
assert(["5" "3.14"], "53.14") #String String=String
assert(["5" 3.14], "53.14") #String Number=String
assert([5 3.14], "53.14") #Number Number=String
assert([3.14 "15" 92 65], "3.14159265")

#Operator % (modulo)
assert(25%7, 4)

#Other operators
a3=(2+4*7-3^2)/3 % 2 #Operators +-*^/%
assert(a3, 1)
assert(["z" 5+8 "h" 3*7], "z13h21") #concat has lower precedence than +

#User defined functions
f()=3.14 #function definition
assert(f(), 3.14)
f(x)=3.14*x #function with parameter
assert(f(2), 6.28)
f(x)=floor(x) #function calling pre-defined function
assert(f(3.14), 3)
assert(f(3.14), f(3.99)) #two function calls
#f(radians) = radians * 180 / pi #f(2 * pi)
f(x,y)=x*y #two parameters
assert(f(2,3), 6)
f2(i)=f(i,i*i)*i #function calling newly defined function
assert(f2(2), 16)
#
#
#Pre-defined functions

#sin(d)
assert(int(sin(30)*10000+0.5)/10000, 1/2)
assert(int(sin(45)*10000+0.5)/10000, int(1/sqrt(2)*10000+0.5)/10000)
assert(sin(60), sqrt(3)/2)
assert(sin(90), 1)
assert(sin(r2d(d2r(90))), 1)

#cos(d)
assert(cos(0), 1)
assert(int(cos(45)*10000+0.5)/10000, int(1/sqrt(2)*10000+0.5)/10000)
assert(int(cos(60)*10000+0.5)/10000, 1/2)

#tan(d)
myTan(x)=sin(x)/cos(x)
assert(int(tan(30)*10000+0.5)/10000, int(1/sqrt(3)*10000+0.5)/10000)
assert(int(tan(45)*10000+0.5)/10000, 1)
assert(int(tan(45)*10000+0.5)/10000, int(myTan(45)*10000+0.5)/10000)
assert(int(tan(60)*10000+0.5)/10000, int(sqrt(3)*10000+0.5)/10000)

#asin(x)
assert(int(asin(sin(45))*10000+0.5)/10000, 45)
assert(sin(asin(d2r(45))), d2r(45))

#acos(x)
assert(acos(cos(45)), 45)
assert(int(cos(acos(d2r(45)))*10000+0.5)/10000, int(d2r(45)*10000+0.5)/10000)

#atan(x)
assert(int(atan(tan(45))*10000+0.5)/10000, 45)
assert(atan(1), 45)

#abs(x)
assert(abs(3.14), 3.14)
assert(abs(-3.14), 3.14)

#round(x)
assert(round(3.14), 3)
assert(round(3.54), 4)
assert(round(-3.14), -3)
assert(round(-3.54), -4)

#ceil(x)
assert(ceil(3.14), 4)
assert(ceil(3.54), 4)
assert(ceil(-3.14), -3)
assert(ceil(-3.54), -3)

#floor(x)
assert(floor(3.14), 3)
assert(floor(3.54), 3)
assert(floor(-3.14), -4)
assert(floor(-3.54), -4)

#int(x)
assert(int(3.14), 3)
assert(int(3.54), 3)
assert(int(-3.14), -3)
assert(int(-3.54), -3)

#mod(a, b)
assert(mod(25, 7), 4)
assert(mod(-13, 64), -13)
myMod(x,n)=((x%n)+n)%n #https://stackoverflow.com/questions/4467539/javascript-modulo-not-behaving
assert(myMod(-13, 64), 51)

#log(x)
assert(log(8)/log(2), 3)

#exp(x)
assert(exp(0), 1)
assert(floor(exp(1)*10000), 2.7182*10000)

#sqrt(x)
assert(sqrt(9), 3)

#min
assert(min(3.14, 4), 3.14)

#max
assert(max(3.14, 4), 4)

#random
["Random: " random()]

#gcd
assert(gcd(1071, 1029), 21)

#fib
assert(fib(50), 12586269025)
#
#
#Computing with coordinates
$W0="N 49° 16.130 E 008° 40.453"
$W1="N 49° 15.903 E 008° 40.777"
$W2="N 49° 16.182 E 008° 40.830"

#bearing(wp1, wp2): Bearing in degrees
assert(int(bearing($W0, $W1)), 137)
assert(int(bearing($W1, $W0)), 317)
assert(int(bearing($W0, $W2)), 78)
assert(int(bearing($W2, $W0)), 258)
assert(int(bearing($W1, $W2)), 7)
assert(int(bearing($W2, $W1)), 187)

#cb(wp1, bearing1, wp2, bearing2): Crossbearing
assert(cb($W0, 78, $W1, 7), $W2)
assert(cb($W0, 137, $W2, 187), $W1)
assert(cb($W1, 317, $W2, 258), $W0)

#distance(wp1, wp2): Distance in meters
assert(distance($W0, $W0), 0)
assert(int(distance($W0, $W1) + 0.5), 575)
assert(int(distance($W1, $W0) + 0.5), 575)
assert(int(distance($W0, $W2) + 0.5), 466)
assert(int(distance($W1, $W2)), 521)

#project(wp, angle, distance): Project from wp angle degrees distance meters
assert(project($W0, 137, 575), $W1)
assert(project($W0, 78, 466), $W2)
assert(project($W1, 317, 575), $W0)
assert(project($W1, 7, 521), $W2)

#midpoint(wp1, wp2): Midpoint between wp1 and wp2
$M1=project($W0,bearing($W0,$W1),distance($W0,$W1)/2)
assert(midpoint($W0, $W1), $M1)

#format(wp, fmt): Format waypoint (dmm, dms, dd)
assert(format($W0, "dmm"), $W0)
assert(format($W0, "dms"), "N 49° 16' 07.80\" E 008° 40' 27.18\"")
assert(format($W0, "dd"), "N 49.26883° E 008.67422°")
assert(format("N49°16.130E008°40.453", "dmm"), $W0)
assert(format("N 49.26883 E 8.67422", "dmm"), $W0) #convert dd to dmm
assert(parse("format('N 49° 16.130 E 008° 40.453', 'x1')"), "Unknown format: 'x1' (pos 0-2)")
$M2=format(project($W1,bearing($W1,$W2),distance($W1,$W2)/2), "dms")
assert($M2, "N 49° 16' 02.58\" E 008° 40' 48.18\"")
assert(format(midpoint($W1, $W2), "dms"), $M2)
assert(format($M2, "dmm"), "N 49° 16.043 E 008° 40.803")
assert(format($M2, "dd"), "N 49.26738° E 008.68005°")
assert(project($W1,bearing($W1,$M2)+0.1,distance($W1,$M2)*1.994), $W2) #(with fragile corrections)
$M3=format(project($W2,bearing($W2,$W0),distance($W2,$W0)/2), "dd")
assert($M3, "N 49.26927° E 008.67735°")
assert(format(midpoint($W2, $W0), "dd"), $M3)
assert(format($M3, "dmm"), "N 49° 16.156 E 008° 40.641")
assert(format($M3, "dms"), "N 49° 16' 09.37\" E 008° 40' 38.46\"")

#ct(n): Crosstotal of number
assert(ct(1234567890), 45)
assert(ct("1234567890"), 45)
assert(ct("R9z876gh5432%.*^/+-10"), 45)

#cti(n): Crosstotal iterative of number
assert(cti("1234567890"), 9)
assert(ct(ct("1234567890")), 9)
assert(cti("R9z876gh5432%.*^/+-10"), 9)

#val(s): Sum of character values
assert(val("a"), 1)
assert(val("Z"), 26)
assert(val("abcdefghijklmnopqrstuvw xyz"), 351)
assert(val("äöüß"), 0)
assert(val(1234567), 0)
assert(val("1234567"), 0)

#sval(s): List of character values
assert(sval("ABCDEFGZz"), "01 02 03 04 05 06 07 26 26")
assert(sval("ABCabcxyzxyZäöü"), "01 02 03 01 02 03 24 25 26 24 25 26")

#vstr(s [,shift]): numbers to characters (new) (specification of shift may change)
assert(vstr("01"), "a")
assert(vstr("26"), "z")
assert(vstr(1), "a")
assert(vstr(27), "a")
assert(vstr("01 02"), "ab")
assert(vstr("01,02"), "ab")
assert(vstr("01 02 03 24 25 26"), "abcxyz")
assert(vstr("01 02 03 24 25 26", 1), "bcdyza")
assert(vstr("00 01 02 03 24 25 26 27", 1), "abcdyzab")
assert(vstr(sval("chiffre")), "chiffre")

#encode(s, m1, m2): Encode s with character mapping m1 to m2
assert(encode("ABBA17abba", "AB7", "OS2"), "OSSO12abba")
assert(val(encode(lc("ÄÖüß"), "äöüß", "{|}~")), 0)

#instr(s, s2): Index of s2 in s, starting at 1 (0=not found)
assert(instr("abc", "a"), 1)
assert(instr("abc", "d"), 0)
assert(instr("abcABCabc", "ab"), 1)
assert(instr("abcABCabc", "BC"), 5)

#len(s): Length of string
assert(len(""), 0)
assert(len("abcABCabc"), 9)

#countstr(s, c): Count substring in string
assert(countstr("str1,str2,str3,str4", ","), 3)
assert(countstr("str1,str2,str3,str4", "str"), 4)

#count(s, s2): count individual characters from s2 in string s
assert(count("str1,str2,str3,str4", ","), 3)
assert(count("str1,str2,str3,st", "str"), "s=4 t=4 r=3")

#mid(s, index, length): (substring with index starting at 1 and length)
assert(mid("abcABCabc", 3, 5), "cABCa")

#uc(s): Uppercase string (beware: Chrome converts ß to SS!)
assert(uc("abcäöüABC"), "ABCÄÖÜABC")

#lc(s): Lowercase string
assert(lc("ABCÄÖÜßabc"), "abcäöüßabc")

#replace(s, find, rep): Replace all find by rep in s (all occurences)
assert(replace("abcABCabc", "bc", "Xy"), "aXyABCaXy")

#reverse
assert(reverse("abcZ"), "Zcba")

#rot13
assert(rot13("abcdefghijklmnopqrstuvexyzABC"), "nopqrstuvwxyzabcdefghirklmNOP")

#nformat
assert(0:000:, "000")
assert(8.2:000.0:, "008.2")
assert(8.2:000.000:, "008.200")

#zformat
assert(zformat(0, 3), "000")
assert(zformat(8.2, 5), "008.2")

#isEqual

#getConst(type): Get constant
assert(getConst("PI"), 3.141592653589793)
assert(getConst("E"), 2.718281828459045)
assert(parse("getConst('e1')"), "Unknown constant: 'e1' (pos 0-2)")
#
#assert (assertEqual)
#
#assert(10^309, "Infinity")
assert(10^309, 10^310) #both Infinity
#
assert(parse("3+4 cls()"), "")
assert(parse("?"), "Unrecognized token: '?' (pos 0-1)")
assert(parse("/"), "Unexpected token: '/' (pos 0-1)")
assert(parse("a"), "Variable is undefined: 'a' (pos 0-1)")
assert(parse("a="), "Unexpected end of file: '' (pos 2-2)")
assert(parse("a=b"), "Variable is undefined: 'b' (pos 2-3)")
assert(parse("1=1"), "Invalid lvalue at: '=' (pos 1-2)")
assert(parse("1+5-28="), "Invalid lvalue at: '=' (pos 6-7)")
assert(parse("1*f="), "Invalid lvalue at: '=' (pos 3-4)")
assert(parse("2^ f(9,u)+8 * 9="), "Invalid lvalue at: '=' (pos 15-16)")
assert(parse("a(5*10)="), "Invalid argument 1 for function: 'a' (pos 0-1)")
assert(parse("a(b,5*10)="), "Invalid argument 2 for function: 'a' (pos 0-1)")
assert(parse("a()"), "Function is undefined: 'a' (pos 0-1)")
assert(parse("(a"), "Expected closing parenthesis: ')' (pos 1-2)")
assert(parse("a(1"), "Expected closing parenthesis for function: ')' (pos 1-2)")
#
#assert(parse("\""), "Unterminated string: '' (pos 1-1)")
#assert(parse(999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999), "Number is too large or too small: 'Infinity' (pos 12-20)")
#
"ok"
*/ });
