package Ecole::Model;

use strict;
use warnings;

use Ecole::Config;
use DBIx::Skinny;

sub select {
	my ($self, $sql, $hash, $array, $name) = @_;
	unless ($name) {
		($name) = ($sql =~ /FROM ([^\s]+)/i)
	}
	[ $self->search_named($sql, $hash || {}, $array || [], $name) ];
}


1;
