#!/usr/bin/env perl

use strict;
use warnings;

use LWP::Simple qw($ua);
use HTTP::Request::Common;
use File::Slurp;

my $file = shift @ARGV;

my $res = $ua->request(POST 'http://localhost:5000/api/buffer', [
	name => $file,
	body => scalar read_file($file),
]);

$res->code == 200 or die $res->content;


