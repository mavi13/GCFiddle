/* globals addExample */

"use strict";

addExample("test", function() {
/*!#GCJVT3: Irren ist menschlich - To err is human (archived)
#https://coord.info/GCJVT3
#(Example with permission by rosszwerg.)
#
# Parking
$W0="N 49° 18.071 E 008° 42.167"
#
$W1="N 49° 18.213 E 008° 42.289"
people=2000
year1=1934
year2=1945
# ct=crosstotal=sum of digits
# sum of the digits of deported people * 112 - 5
AAA=ct(people) * 112 - 5
# sum of the sums of the digits of both years * 10
BBB=(ct(year1) + ct(year2)) * 10
#
$W2=["N 49° 18." AAA " E 008° 42." BBB]
year3=1936
# (sum of the digits of the year – 1) * 17
CCC=(ct(year3) - 1) * 17
# sum of the digits of the year * 13
DDD=ct(year3) * 13
#
$W3=["N 49° 18." CCC " E 008° 42." DDD]
holes=2
# number of "head-holes" * 257 + 1
EEE=holes * 257 + 1
# number of "head-holes" * 244
FFF=holes * 244
#
$W4=["N 49° 18." EEE " E 008° 42." FFF]
# read: http://de.wikipedia.org/wiki/Blumepeter
birth=1875
decease=1940
age=decease-birth
# his age in years * 9
GGG=(age) * 9
# date of decease - 1487
HHH=decease - 1487
#
$GCJVT3=["N 49° 18." GGG " E 008° 42." HHH]
# N 49° 18.585 E 008° 42.453
#
*/ });
