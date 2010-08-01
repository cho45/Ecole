package Ecole::Model::Row::Buffer;
use strict;
use warnings;
use base 'DBIx::Skinny::Row';

sub as_stash {
	my ($self) = @_;
	+{
		name       => $self->name,
		body       => $self->body,
		created_at => $self->created_at->epoch,
	}
}


1;
__END__



