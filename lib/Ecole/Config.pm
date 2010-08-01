package Ecole::Config;

use strict;
use warnings;

use Path::Class;

my ($root, $name, $config);
BEGIN {
	$root   = file(__FILE__)->dir->parent->parent->absolute;
	$name   = $root->file('ecole.conf');
	$config = do "$name" or die "$!: $@";
}

my $instance;

sub instance {
	my ($class) = @_;
	bless $config, $class;
}

sub root {
	$root;
}



1;
__END__



