package Ecole::Model::Schema;

use strict;
use warnings;

use DBIx::Skinny::Schema;
use DateTime;

my $dtf = 'DateTime::Format::SQLite';
$dtf->use or die $@;

install_utf8_columns qw/name body/;

install_inflate_rule '_at$' => callback {
	inflate {
		$dtf->parse_datetime($_[0]);
	};
	deflate {
		$dtf->format_datetime($_[0]);
	};
};

install_table session => schema {
	pk 'id';
	columns qw(
		id
		name
		created_at
	);

	trigger pre_insert => callback {
		my ($class, $args, $table) = @_;
		$args->{created_at} = DateTime->now;
	};

};


install_table buffer => schema {
	pk 'id';
	columns qw(
		id
		name
		body 
		modified_at 
		created_at
	);
	
	trigger pre_insert => callback {
		my ($class, $args, $table) = @_;
		$args->{created_at} = $args->{modified_at} = DateTime->now;
	};

	trigger pre_update => callback {
		my ($class, $args, $table) = @_;
		$args->{modified_at} = DateTime->now;
	};
};

1;

