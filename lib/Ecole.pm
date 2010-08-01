package Ecole;

use strict;
use warnings;

use URI::Escape;

use Ecole::Router;
use Ecole::Config;
use Ecole::Model;
use Ecole::Request;
use Ecole::Response;
use Ecole::View;
use Ecole::Empty;

route '/', action => sub {
	my ($r) = @_;
	$r->html('buffer.html');
};

route '/api/buffer', method => GET, action => sub {
	my ($r) = @_;
	my $after   = $r->req->param('after') || 0;
	my $buffers = Ecole::Model->select(q{
		SELECT * FROM buffer
		WHERE created_at > datetime(:epoch, 'unixepoch')
		ORDER BY created_at DESC 
		LIMIT 2
	}, {
		epoch => $after,
	});
	$r->json([
		map {
			$_->as_stash
		}
		@$buffers
	]);
};

route '/api/buffer', method => POST, action => sub {
	my ($r) = @_;
	my $name = $r->req->param('name');
	my $body = $r->req->param('body');
	my $buffer = Ecole::Model->insert('buffer', {
		session_id => 0,
		name       => $name,
		body       => $body,
	});
	$r->json({
		status => 'ok',
		buffer => {
		}
	});
};

sub uri_for {
	my ($r, $path, $args) = @_;
	$path ||= "";
	my $uri = $r->req->base;
	$uri->path(($r->config->{root} || $uri->path) . $path);
	$uri->query_form(@$args) if $args;
	$uri;
}

sub abs_uri {
	my ($r, $path, $args) = @_;
	$path ||= "";
	my $uri = URI->new($r->config->{base});
	$uri->path(($r->config->{root} || $uri->path) . $path);
	$uri->query_form(@$args) if $args;
	$uri;
}

# static methods

sub run {
	my ($env) = @_;
	my $req = Ecole::Request->new($env);
	my $res = Ecole::Response->new;
	my $niro = Ecole->new(
		req => $req,
		res => $res,
	);
	$niro->_run;
}

sub new {
	my ($class, %opts) = @_;
	bless {
		%opts
	}, $class;
}

sub config {
	Ecole::Config->instance;
}

sub _run {
	my ($self) = @_;
	Ecole::Router->dispatch($self);
	$self->res->finalize;
}

sub req { $_[0]->{req} }
sub res { $_[0]->{res} }
sub log {
	my ($class, $format, @rest) = @_;
	print STDERR sprintf($format, @rest) . "\n";
}

sub stash {
	my ($self, %params) = @_;
	$self->{stash} = {
		%{ $self->{stash} || {} },
		%params
	};
	$self->{stash};
}

sub error {
	my ($self, %opts) = @_;
	$self->res->status($opts{code} || 500);
	$self->res->body($opts{message} || $opts{code} || 500);
}


my $db = Ecole::Config->instance->root->file(($ENV{HTTP_HOST} || "") =~ /\blab\b/ ? 'ecole-test.db' : 'ecole.db');
Ecole::Model->connect_info({
	dsn => 'dbi:SQLite:' . $db,
});
unless (-f $db) {
	Ecole::Model->do($_) for split /;/, do {
		my $schema = Ecole->config->root->file('db', 'schema.sql')->slurp;
		$schema =~ s/;\s*$//;
		$schema;
	};
}

1;
__END__





